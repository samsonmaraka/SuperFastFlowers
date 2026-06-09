import 'server-only';

import { getEnv } from '@/lib/env';
import { OrderRequest, OrderStatus, PesapalOrderPayment } from '@/lib/types';

export type PesapalSubmitOrderInput = {
  order: OrderRequest;
  merchantReference: string;
  amount: number;
};

export type PesapalTransactionStatus = {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number;
  merchant_reference?: string;
  currency?: string;
  error?: unknown;
  status?: string;
  [key: string]: unknown;
};

export type PesapalTokenResponse = {
  token?: string;
  expiryDate?: string;
  error?: unknown;
  message?: string;
  status?: string;
};

type PesapalIpnResponse = {
  url?: string;
  created_date?: string;
  ipn_id?: string;
  notification_type?: string;
  ipn_notification_type_description?: string;
  ipn_status?: number;
  status?: string;
  message?: string;
  error?: unknown;
  [key: string]: unknown;
};

type PesapalSubmitOrderResponse = {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  error?: unknown;
  status?: string;
  message?: string;
  [key: string]: unknown;
};

export type PesapalEnvironment = 'production' | 'sandbox' | 'unknown';

export type PesapalSafeDiagnostics = {
  debugCode?: string;
  environment: PesapalEnvironment;
  hasBaseUrl: boolean;
  hasConsumerKey: boolean;
  hasConsumerSecret: boolean;
  hasIpnId: boolean;
  siteUrl: string;
  submitUrlHost?: string;
  submitUrlPath?: string;
  callbackUrl?: string;
  cancellationUrl?: string;
  maskedIpnId?: string;
  httpStatus?: number;
  pesapalStatus?: string;
  pesapalMessage?: string;
  pesapalError?: unknown;
};

export class PesapalError extends Error {
  status?: number;
  details?: unknown;
  safeDiagnostics?: PesapalSafeDiagnostics;
  debugCode?: string;

  constructor(message: string, options?: { status?: number; details?: unknown; safeDiagnostics?: PesapalSafeDiagnostics; debugCode?: string }) {
    super(message);
    this.name = 'PesapalError';
    this.status = options?.status;
    this.details = options?.details;
    this.debugCode = options?.debugCode || options?.safeDiagnostics?.debugCode;
    this.safeDiagnostics = options?.safeDiagnostics
      ? { ...options.safeDiagnostics, ...(this.debugCode ? { debugCode: this.debugCode } : {}) }
      : undefined;
  }
}

function normalizePesapalBaseUrl(baseUrl: string) {
  return baseUrl
    .trim()
    .replace(/\/+$|\s+$/g, '')
    .replace(/\/api\/Auth\/RequestToken$/i, '')
    .replace(/\/api\/URLSetup\/RegisterIPN$/i, '')
    .replace(/\/api\/Transactions\/SubmitOrderRequest$/i, '')
    .replace(/\/api\/Transactions\/GetTransactionStatus$/i, '');
}

function getPesapalEnvironment(baseUrl: string): PesapalEnvironment {
  const normalized = normalizePesapalBaseUrl(baseUrl).toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('pay.pesapal.com')) return 'production';
  if (normalized.includes('cybqa.pesapal.com') || normalized.includes('demo.pesapal.com') || normalized.includes('sandbox')) return 'sandbox';
  return 'unknown';
}

function maskValue(value: string) {
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getSubmitUrlParts(baseUrl: string) {
  if (!baseUrl) return {};
  try {
    const url = new URL(`${normalizePesapalBaseUrl(baseUrl)}/api/Transactions/SubmitOrderRequest`);
    return { submitUrlHost: url.host, submitUrlPath: url.pathname };
  } catch {
    return { submitUrlPath: '/api/Transactions/SubmitOrderRequest' };
  }
}

export function getPesapalSafeDiagnostics(options?: {
  debugCode?: string;
  httpStatus?: number;
  data?: Pick<PesapalTokenResponse | PesapalSubmitOrderResponse, 'error' | 'message' | 'status'>;
  submitUrl?: string;
  callbackUrl?: string;
  cancellationUrl?: string;
}): PesapalSafeDiagnostics {
  const env = getEnv();
  const submitUrlParts = options?.submitUrl
    ? getSubmitUrlParts(options.submitUrl.replace(/\/api\/Transactions\/SubmitOrderRequest$/i, ''))
    : getSubmitUrlParts(env.pesapalBaseUrl);

  return {
    debugCode: options?.debugCode,
    environment: getPesapalEnvironment(env.pesapalBaseUrl),
    hasBaseUrl: Boolean(env.pesapalBaseUrl),
    hasConsumerKey: Boolean(env.pesapalConsumerKey),
    hasConsumerSecret: Boolean(env.pesapalConsumerSecret),
    hasIpnId: Boolean(env.pesapalIpnId),
    siteUrl: env.siteUrl,
    ...submitUrlParts,
    callbackUrl: options?.callbackUrl,
    cancellationUrl: options?.cancellationUrl,
    maskedIpnId: env.pesapalIpnId ? maskValue(env.pesapalIpnId) : undefined,
    httpStatus: options?.httpStatus,
    pesapalStatus: options?.data?.status,
    pesapalMessage: options?.data?.message,
    pesapalError: options?.data?.error
  };
}


export function getPesapalEnvPresence() {
  const diagnostics = getPesapalSafeDiagnostics();
  return {
    PESAPAL_BASE_URL: diagnostics.hasBaseUrl,
    PESAPAL_CONSUMER_KEY: diagnostics.hasConsumerKey,
    PESAPAL_CONSUMER_SECRET: diagnostics.hasConsumerSecret,
    PESAPAL_IPN_ID: diagnostics.hasIpnId,
    NEXT_PUBLIC_SITE_URL: Boolean(diagnostics.siteUrl)
  };
}

function logSafePesapalDiagnostics(label: string, diagnostics: PesapalSafeDiagnostics) {
  console.info(label, diagnostics);
}

function requirePesapalEnv() {
  const env = getEnv();
  const missing = [
    ['PESAPAL_CONSUMER_KEY', env.pesapalConsumerKey],
    ['PESAPAL_CONSUMER_SECRET', env.pesapalConsumerSecret],
    ['PESAPAL_BASE_URL', env.pesapalBaseUrl],
    ['NEXT_PUBLIC_SITE_URL', env.siteUrl]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new PesapalError(`Missing Pesapal environment variables: ${missing.join(', ')}`, {
      debugCode: 'PESAPAL_ENV_MISSING',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_ENV_MISSING' })
    });
  }

  return env;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PesapalError('Pesapal returned a non-JSON response.', {
      status: response.status,
      details: text,
      debugCode: 'PESAPAL_NON_JSON_RESPONSE',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_NON_JSON_RESPONSE', httpStatus: response.status })
    });
  }
}

function pesapalHeaders(token?: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function buildPesapalUrl(path: string) {
  const env = getEnv();
  const normalizedBaseUrl = normalizePesapalBaseUrl(env.pesapalBaseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function buildPesapalMerchantReference(orderId: string) {
  const normalizedOrderId = orderId.replace(/[^A-Za-z0-9_.:-]/g, '-');
  return `ORDER-${normalizedOrderId}`.slice(0, 50);
}

export function orderIdFromPesapalMerchantReference(merchantReference: string) {
  return merchantReference
    .replace(/^GIFTORA-/, '')
    .replace(/^ORDER-/, '')
    .replace(/^ORDER#/, '');
}

export async function getPesapalTokenResponse() {
  const env = requirePesapalEnv();
  const authUrl = `${normalizePesapalBaseUrl(env.pesapalBaseUrl)}/api/Auth/RequestToken`;
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: pesapalHeaders(),
    body: JSON.stringify({
      consumer_key: env.pesapalConsumerKey,
      consumer_secret: env.pesapalConsumerSecret
    }),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalTokenResponse>(response);
  const safeDiagnostics = getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_AUTH_RESPONSE', httpStatus: response.status, data });

  logSafePesapalDiagnostics('[PESAPAL_AUTH_RESPONSE]', safeDiagnostics);

  if (response.status !== 200 || !data.token) {
    throw new PesapalError('Pesapal authentication failed.', {
      status: response.status,
      details: data,
      debugCode: 'PESAPAL_AUTH_FAILED',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_AUTH_FAILED', httpStatus: response.status, data })
    });
  }

  return data;
}

export async function getPesapalToken() {
  const data = await getPesapalTokenResponse();
  return data.token as string;
}

export async function registerPesapalIpn() {
  const env = requirePesapalEnv();
  const token = await getPesapalToken();
  const ipnUrl = `${env.siteUrl}/api/pesapal/ipn`;
  const response = await fetch(buildPesapalUrl('/api/URLSetup/RegisterIPN'), {
    method: 'POST',
    headers: pesapalHeaders(token),
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'POST'
    }),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalIpnResponse>(response);

  if (!response.ok || !data.ipn_id) {
    throw new PesapalError('Pesapal IPN registration failed.', {
      status: response.status,
      details: data,
      debugCode: 'PESAPAL_IPN_REGISTRATION_FAILED',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_IPN_REGISTRATION_FAILED', httpStatus: response.status, data })
    });
  }

  return data;
}

export async function submitPesapalOrder({ order, merchantReference, amount }: PesapalSubmitOrderInput) {
  const env = requirePesapalEnv();
  if (!env.pesapalIpnId) {
    throw new PesapalError('PESAPAL_IPN_ID is missing. Register IPN and configure the returned ipn_id.', {
      status: 500,
      debugCode: 'PESAPAL_IPN_ID_MISSING',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_IPN_ID_MISSING' })
    });
  }

  const token = await getPesapalToken();
  const deliveryArea = order.cityId === 'delivery-pin' ? order.region : order.cityId;
  const submitUrl = buildPesapalUrl('/api/Transactions/SubmitOrderRequest');
  const callbackUrl = `${env.siteUrl}/payment/callback`;
  const cancellationUrl = `${env.siteUrl}/checkout`;
  const requestBody = {
    id: merchantReference,
    currency: 'UGX',
    amount,
    description: 'Giftora order payment',
    callback_url: callbackUrl,
    cancellation_url: cancellationUrl,
    notification_id: env.pesapalIpnId,
    billing_address: {
      email_address: order.email,
      phone_number: order.recipientPhone,
      first_name: order.recipientName,
      last_name: '',
      line_1: deliveryArea,
      city: deliveryArea,
      state: order.region,
      country_code: 'UG'
    }
  };

  const submitUrlObject = new URL(submitUrl);
  console.info('[PESAPAL_SUBMIT_ORDER_REQUEST]', {
    merchantReference,
    amount,
    currency: requestBody.currency,
    callback_url: callbackUrl,
    cancellation_url: cancellationUrl,
    notification_id_masked: maskValue(env.pesapalIpnId),
    hasBaseUrl: Boolean(env.pesapalBaseUrl),
    environment: getPesapalEnvironment(env.pesapalBaseUrl),
    submitUrlHost: submitUrlObject.host,
    submitUrlPath: submitUrlObject.pathname
  });

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers: pesapalHeaders(token),
    body: JSON.stringify(requestBody),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalSubmitOrderResponse>(response);
  const safeDiagnostics = getPesapalSafeDiagnostics({
    debugCode: 'PESAPAL_SUBMIT_ORDER_RESPONSE',
    httpStatus: response.status,
    data,
    submitUrl,
    callbackUrl,
    cancellationUrl
  });

  console.info('[PESAPAL_SUBMIT_ORDER_RESPONSE]', {
    httpStatus: response.status,
    responseBody: data,
    safeDiagnostics
  });

  if (!response.ok || !data.order_tracking_id || !data.redirect_url) {
    throw new PesapalError('Pesapal order submission failed.', {
      status: response.status,
      details: data,
      debugCode: 'PESAPAL_SUBMIT_ORDER_FAILED',
      safeDiagnostics: {
        ...safeDiagnostics,
        debugCode: 'PESAPAL_SUBMIT_ORDER_FAILED'
      }
    });
  }

  return data;
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  if (!orderTrackingId) throw new PesapalError('Missing Pesapal order tracking ID.');

  const token = await getPesapalToken();
  const url = new URL(buildPesapalUrl('/api/Transactions/GetTransactionStatus'));
  url.searchParams.set('orderTrackingId', orderTrackingId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: pesapalHeaders(token),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalTransactionStatus>(response);

  if (!response.ok) {
    throw new PesapalError('Pesapal transaction status lookup failed.', {
      status: response.status,
      details: data,
      debugCode: 'PESAPAL_STATUS_LOOKUP_FAILED',
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_STATUS_LOOKUP_FAILED', httpStatus: response.status, data })
    });
  }

  return data;
}

export function mapPesapalTransactionToOrderStatus(status: PesapalTransactionStatus): OrderStatus {
  const statusDescription = String(status.payment_status_description || status.status || '').toUpperCase();
  const statusCode = Number(status.status_code);

  if (statusDescription === 'COMPLETED' || statusCode === 1) return 'PAID';
  if (statusDescription === 'FAILED' || statusCode === 2) return 'PAYMENT_FAILED';
  if (statusDescription === 'REVERSED' || statusCode === 3) return 'PAYMENT_REVERSED';
  if (statusDescription === 'INVALID' || statusCode === 0) return 'PAYMENT_INVALID';

  return 'PAYMENT_PENDING';
}

export function pesapalStatusToPayment(status: PesapalTransactionStatus): PesapalOrderPayment {
  return {
    status: String(status.payment_status_description || status.status || 'PENDING'),
    statusCode: typeof status.status_code === 'number' ? status.status_code : Number.isFinite(Number(status.status_code)) ? Number(status.status_code) : undefined,
    paymentMethod: status.payment_method,
    confirmationCode: status.confirmation_code,
    paymentAccount: status.payment_account,
    amount: typeof status.amount === 'number' ? status.amount : Number.isFinite(Number(status.amount)) ? Number(status.amount) : undefined,
    currency: status.currency,
    rawResponse: status
  };
}
