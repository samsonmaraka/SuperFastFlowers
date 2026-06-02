import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { getEnv } from '@/lib/env';
import { isDataImageUrl, imageFieldContainsBase64 } from '@/lib/product-images';
import { Product } from '@/lib/types';

type DataImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type SignedRequest = {
  method: string;
  protocol: string;
  hostname: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: Buffer;
};

const DEFAULT_PRODUCT_IMAGES_BUCKET = 'giftora-product-images-prod';
const DEFAULT_PRODUCT_IMAGES_PREFIX = 'products';
const DEFAULT_PRODUCT_IMAGES_PUBLIC_BASE_URL = 'https://giftora-product-images-prod.s3.eu-north-1.amazonaws.com';

function getProductImageStorageConfig() {
  const env = getEnv();
  return {
    bucket: process.env.PRODUCT_IMAGES_BUCKET || DEFAULT_PRODUCT_IMAGES_BUCKET,
    prefix: (process.env.PRODUCT_IMAGES_PREFIX || DEFAULT_PRODUCT_IMAGES_PREFIX).replace(/^\/+|\/+$/g, ''),
    publicBaseUrl: (process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL || DEFAULT_PRODUCT_IMAGES_PUBLIC_BASE_URL).replace(/\/+$/g, ''),
    region: env.awsRegion || process.env.AWS_REGION || process.env.REGION || 'eu-north-1'
  };
}

function parseDataImageUrl(value: string): DataImage | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  const extension = contentTypeToExtension(contentType);
  const buffer = Buffer.from(match[2], 'base64');

  if (!buffer.length) return null;
  return { buffer, contentType, extension };
}

function contentTypeToExtension(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

function buildObjectKey(productId: string, extension: string) {
  const { prefix } = getProductImageStorageConfig();
  const safeProductId = productId.replace(/[^a-zA-Z0-9._-]/g, '-');
  const randomPart = crypto.randomUUID();
  return `${prefix}/${safeProductId}/${Date.now()}-${randomPart}.${extension}`;
}

function buildPublicUrl(objectKey: string) {
  const { publicBaseUrl } = getProductImageStorageConfig();
  return `${publicBaseUrl}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}

function isS3CompatibleStoredValue(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith(`${getProductImageStorageConfig().prefix}/`);
}

function logImageDiagnostic(event: 'imageUploadStarted' | 'imageUploadSucceeded' | 'imageUploadFailed', details: Record<string, unknown>) {
  console.log(`[product-images] ${event}`, details);
}

async function uploadBufferToS3(params: { objectKey: string; body: Buffer; contentType: string }) {
  const { bucket, region } = getProductImageStorageConfig();
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 's3',
    sha256: Sha256,
    uriEscapePath: false,
    applyChecksum: true
  });

  const path = `/${params.objectKey.split('/').map(encodeURIComponent).join('/')}`;
  const request = {
    method: 'PUT',
    protocol: 'https',
    hostname: `${bucket}.s3.${region}.amazonaws.com`,
    path,
    query: {},
    headers: {
      'content-type': params.contentType,
      'content-length': String(params.body.length),
      host: `${bucket}.s3.${region}.amazonaws.com`
    },
    body: params.body
  } satisfies SignedRequest;

  const signedRequest = await signer.sign(request);
  const response = await fetch(`${signedRequest.protocol}://${signedRequest.hostname}${signedRequest.path}`, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: params.body
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`S3 upload failed with status ${response.status}${errorText ? `: ${errorText.slice(0, 300)}` : ''}`);
  }
}

export async function uploadNewProductImagesToS3(product: Product): Promise<Product> {
  const { bucket, region } = getProductImageStorageConfig();
  const uploadedImageUrls: string[] = [];

  for (const imageValue of product.imageUrls) {
    if (!isDataImageUrl(imageValue)) {
      uploadedImageUrls.push(imageValue);
      continue;
    }

    const dataImage = parseDataImageUrl(imageValue);
    if (!dataImage) {
      throw new Error('Uploaded product image could not be decoded. Please choose a valid image and try again.');
    }

    const objectKey = buildObjectKey(product.id, dataImage.extension);
    const finalImageUrl = buildPublicUrl(objectKey);

    logImageDiagnostic('imageUploadStarted', {
      bucket,
      region,
      objectKey,
      productId: product.id,
      contentType: dataImage.contentType,
      byteLength: dataImage.buffer.length
    });

    try {
      await uploadBufferToS3({ objectKey, body: dataImage.buffer, contentType: dataImage.contentType });
      uploadedImageUrls.push(finalImageUrl);
      logImageDiagnostic('imageUploadSucceeded', {
        bucket,
        region,
        objectKey,
        productId: product.id,
        finalImageUrl
      });
    } catch (error) {
      logImageDiagnostic('imageUploadFailed', {
        bucket,
        region,
        objectKey,
        productId: product.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  const savedImageValuesContainBase64 = uploadedImageUrls.some((value) => imageFieldContainsBase64(value) && !isS3CompatibleStoredValue(value));
  console.log('[product-images] dynamoImageFieldPrepared', {
    productId: product.id,
    imageCount: uploadedImageUrls.length,
    storesUrlOrKeyRatherThanBase64: !savedImageValuesContainBase64,
    firstImageValueKind: uploadedImageUrls[0]?.startsWith('http') ? 'url' : uploadedImageUrls[0]?.startsWith(`${getProductImageStorageConfig().prefix}/`) ? 's3-key' : 'other'
  });

  return {
    ...product,
    imageUrls: uploadedImageUrls
  };
}
