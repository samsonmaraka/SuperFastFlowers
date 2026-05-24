import 'server-only';
import { getEnv } from '@/lib/env';
import { listProducts } from '@/lib/products-repo';
import { OrderRequest } from '@/lib/types';
import { formatUgx } from '@/lib/format';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

type OrderEmailLine = {
  productId: string;
  quantity: number;
  name: string;
  unitPrice?: number;
  lineTotal?: number;
};

async function buildOrderLines(order: OrderRequest): Promise<OrderEmailLine[]> {
  const products = await listProducts();

  return (order.items || []).map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const unitPrice = product?.price;
    const lineTotal = unitPrice !== undefined ? unitPrice * item.quantity : undefined;

    return { productId: item.productId, quantity: item.quantity, name: product?.name || item.productId, unitPrice, lineTotal };
  });
}

export async function sendOrderSuccessEmail(order: OrderRequest) {
  if (!order.email) return;

  const fromEmail = process.env.SES_FROM_EMAIL;
  const awsRegionFromEnv = process.env.AWS_REGION;
  const awsRegion = awsRegionFromEnv || getEnv().awsRegion;

  console.info('[ORDER_EMAIL_ENV] SES email attempt configuration', {
    orderId: order.id,
    recipientEmail: order.email,
    sesFromEmailExists: Boolean(fromEmail),
    awsRegion,
    awsRegionFromEnv: awsRegionFromEnv || null
  });

  if (!fromEmail) {
    console.warn('[ORDER_EMAIL_ENV] SES_FROM_EMAIL is missing. Skipping order success email.', {
      orderId: order.id,
      recipientEmail: order.email,
      sesFromEmailExists: false
    });
    return;
  }

  const sesClient = new SESClient({ region: awsRegion });
  const sesClientResolvedRegion = await sesClient.config.region();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const lines = await buildOrderLines(order);
  const computedTotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
  const hasPriceData = lines.some((line) => line.lineTotal !== undefined);

  const orderedItemsText = lines.map((line) => `- ${line.name} (ID: ${line.productId}) | Qty: ${line.quantity} | Unit price: ${line.unitPrice !== undefined ? `UGX ${formatUgx(line.unitPrice)}` : 'N/A'} | Line total: ${line.lineTotal !== undefined ? `UGX ${formatUgx(line.lineTotal)}` : 'N/A'}`).join('\n');
  const orderedItemsHtml = lines.map((line) => `<li><strong>${line.name}</strong> (ID: ${line.productId}) - Qty: ${line.quantity}, Unit price: ${line.unitPrice !== undefined ? `UGX ${formatUgx(line.unitPrice)}` : 'N/A'}, Line total: ${line.lineTotal !== undefined ? `UGX ${formatUgx(line.lineTotal)}` : 'N/A'}</li>`).join('');

  const textBody = `Order received successfully\n\nHello ${order.recipientName},\n\nYour order request has been received successfully.\nOrder reference: ${order.id}\n\nOrdered items:\n${orderedItemsText}\n\nOrder total: ${hasPriceData ? `UGX ${formatUgx(computedTotal)}` : 'N/A'}\n\nDelivery/contact details:\nRecipient name: ${order.recipientName}\nRecipient phone: ${order.recipientPhone}\nDelivery date: ${order.deliveryDate}\nRegion: ${order.region}\nArea (cityId): ${order.cityId}\nPin URL: ${order.deliveryPinUrl || 'Not provided'}\nCoordinates: ${order.deliveryLatitude ?? 'N/A'}, ${order.deliveryLongitude ?? 'N/A'}\nCustomer email: ${order.email}\nNote: ${order.note || 'N/A'}\n\nVisit ${siteUrl}`;

  const htmlBody = `<h2>Order received successfully</h2><p>Hello ${order.recipientName},</p><p>Your order request has been received successfully.</p><p><strong>Order reference:</strong> ${order.id}</p><h3>Ordered items</h3><ul>${orderedItemsHtml}</ul><p><strong>Order total:</strong> ${hasPriceData ? `UGX ${formatUgx(computedTotal)}` : 'N/A'}</p><h3>Delivery/contact details</h3><ul><li><strong>Recipient name:</strong> ${order.recipientName}</li><li><strong>Recipient phone:</strong> ${order.recipientPhone}</li><li><strong>Delivery date:</strong> ${order.deliveryDate}</li><li><strong>Region:</strong> ${order.region}</li><li><strong>Area (cityId):</strong> ${order.cityId}</li><li><strong>Pin URL:</strong> ${order.deliveryPinUrl || 'Not provided'}</li><li><strong>Coordinates:</strong> ${order.deliveryLatitude ?? 'N/A'}, ${order.deliveryLongitude ?? 'N/A'}</li><li><strong>Customer email:</strong> ${order.email}</li><li><strong>Note:</strong> ${order.note || 'N/A'}</li></ul><p><a href="${siteUrl}">Return to SuperFastFlowers</a></p>`;

  // Amplify runtime role needs: ses:SendEmail and ses:SendRawEmail.
  console.info('[ORDER_EMAIL_START] SES send starting', {
    orderId: order.id,
    recipientEmail: order.email,
    sesFromEmailExists: true,
    awsRegion,
    sesClientRegion: sesClientResolvedRegion,
    usesAwsRegionEnv: Boolean(awsRegionFromEnv)
  });

  const result = await sesClient.send(new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: [order.email] },
    Message: { Subject: { Data: 'Order received successfully', Charset: 'UTF-8' }, Body: { Text: { Data: textBody, Charset: 'UTF-8' }, Html: { Data: htmlBody, Charset: 'UTF-8' } } }
  }));

  console.info('[ORDER_EMAIL_SUCCESS] SES send succeeded', {
    orderId: order.id,
    recipientEmail: order.email,
    messageId: result.MessageId || null,
    awsRegion,
    sesClientRegion: sesClientResolvedRegion
  });
}
