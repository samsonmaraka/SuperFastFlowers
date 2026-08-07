import 'server-only';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getEnv } from '@/lib/env';
import { getPublicSiteUrl } from '@/lib/site-url';
import { listProducts } from '@/lib/products-repo';
import { OrderRequest } from '@/lib/types';
import { formatUgx } from '@/lib/format';
import { getFlavourLabel } from '@/lib/flavours';

type OrderEmailLine = {
  productId: string;
  quantity: number;
  name: string;
  flavourLabel?: string;
  unitPrice?: number;
  lineTotal?: number;
  imageUrl?: string;
  vendorEmail?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function buildOrderLines(order: OrderRequest, products: Awaited<ReturnType<typeof listProducts>>): Promise<OrderEmailLine[]> {
  return (order.items || []).map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : product?.price;
    const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : unitPrice !== undefined ? unitPrice * item.quantity : undefined;

    return {
      productId: item.productId,
      quantity: item.quantity,
      name: item.name || product?.name || item.productId,
      flavourLabel: item.flavourLabel || (item.flavourId ? getFlavourLabel(item.flavourId) : undefined),
      unitPrice,
      lineTotal,
      imageUrl: product?.imageUrls?.[0],
      vendorEmail: product?.vendorEmail
    };
  });
}

function buildItemsTable(lines: OrderEmailLine[]) {
  const rows = lines
    .map((line) => {
      const imageCell = line.imageUrl
        ? `<img src="${escapeHtml(line.imageUrl)}" alt="${escapeHtml(line.name)}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #f3d5df;" />`
        : '<span style="color:#777;">No image</span>';

      return `<tr>
        <td style="padding:10px;border-bottom:1px solid #f3d5df;vertical-align:top;">${imageCell}</td>
        <td style="padding:10px;border-bottom:1px solid #f3d5df;vertical-align:top;"><strong>${escapeHtml(line.name)}</strong>${line.flavourLabel ? `<br /><span style="color:#b3225a;font-weight:bold;">Flavour: ${escapeHtml(line.flavourLabel)}</span>` : ''}<br /><span style="color:#555;">ID: ${escapeHtml(line.productId)}</span></td>
        <td style="padding:10px;border-bottom:1px solid #f3d5df;text-align:center;vertical-align:top;">${line.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #f3d5df;text-align:right;vertical-align:top;">${line.unitPrice !== undefined ? `UGX ${formatUgx(line.unitPrice)}` : 'N/A'}</td>
        <td style="padding:10px;border-bottom:1px solid #f3d5df;text-align:right;vertical-align:top;">${line.lineTotal !== undefined ? `UGX ${formatUgx(line.lineTotal)}` : 'N/A'}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #f3d5df;border-radius:10px;overflow:hidden;">
    <thead><tr style="background:#fff1f5;"><th style="padding:10px;text-align:left;">Image</th><th style="padding:10px;text-align:left;">Item</th><th style="padding:10px;text-align:center;">Qty</th><th style="padding:10px;text-align:right;">Unit price</th><th style="padding:10px;text-align:right;">Line total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function sendSingleOrderEmail(args: {
  sesClient: SESClient;
  fromEmail: string;
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  orderId: string;
}) {
  const result = await args.sesClient.send(
    new SendEmailCommand({
      Source: args.fromEmail,
      Destination: { ToAddresses: [args.toEmail] },
      Message: {
        Subject: { Data: args.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: args.textBody, Charset: 'UTF-8' },
          Html: { Data: args.htmlBody, Charset: 'UTF-8' }
        }
      }
    })
  );

  console.info('[ORDER_EMAIL_SUCCESS] SES send completed', {
    orderId: args.orderId,
    recipientEmail: args.toEmail,
    messageId: result.MessageId || null
  });
}

export async function sendOrderSuccessEmail(order: OrderRequest) {
  const fromEmail = process.env.SES_FROM_EMAIL;
  const awsRegionFromEnv = process.env.AWS_REGION;
  const awsRegion = awsRegionFromEnv || getEnv().awsRegion;

  console.info('[ORDER_EMAIL_ENV] SES email attempt configuration', {
    orderId: order.id,
    customerEmail: order.email || null,
    sesFromEmailExists: Boolean(fromEmail),
    awsRegion,
    awsRegionFromEnv: awsRegionFromEnv || null
  });

  if (!fromEmail) {
    console.warn('[ORDER_EMAIL_ENV] SES_FROM_EMAIL is missing. Skipping order success emails.', {
      orderId: order.id,
      sesFromEmailExists: false
    });
    return;
  }

  const sesClient = new SESClient({ region: awsRegion });
  const sesClientResolvedRegion = await sesClient.config.region();

  const siteUrl = getPublicSiteUrl();
  const products = await listProducts();
  const lines = await buildOrderLines(order, products);
  const computedTotal = typeof order.totalAmount === 'number' ? order.totalAmount : lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
  const hasPriceData = lines.some((line) => line.lineTotal !== undefined) || typeof order.totalAmount === 'number';
  // Delivery fees are now factored into product prices, so do not calculate or display a separate delivery charge.
  const totalWithDelivery = typeof order.totalWithDelivery === 'number' ? order.totalWithDelivery : hasPriceData ? computedTotal : undefined;

  const orderedItemsText = lines
    .map((line) => `- ${line.name}${line.flavourLabel ? ` | Flavour: ${line.flavourLabel}` : ''} (ID: ${line.productId}) | Qty: ${line.quantity} | Unit price: ${line.unitPrice !== undefined ? `UGX ${formatUgx(line.unitPrice)}` : 'N/A'} | Line total: ${line.lineTotal !== undefined ? `UGX ${formatUgx(line.lineTotal)}` : 'N/A'}`)
    .join('\n');
  const orderedItemsHtml = buildItemsTable(lines);

  const totalWithDeliveryText = totalWithDelivery === undefined ? 'N/A' : `UGX ${formatUgx(totalWithDelivery)}`;
  const pinUrlHtml = order.deliveryPinUrl ? `<a href="${escapeHtml(order.deliveryPinUrl)}">View delivery pin</a>` : 'Not provided';

  const buildEmailBodies = (introText: string, introHtml: string, footerText?: string) => {
    const footerTextBlock = footerText ? `\n\n${footerText}` : '';
    const footerHtml = footerText ? `<p>${escapeHtml(footerText)}</p>` : '';

    return {
      textBody: `Order received successfully\n\n${introText}\nOrder reference: ${order.id}\n\nOrdered items:\n${orderedItemsText}\n\nSubtotal: ${hasPriceData ? `UGX ${formatUgx(computedTotal)}` : 'N/A'}
Total: ${totalWithDeliveryText}\n\nDelivery/contact details:\nRecipient name: ${order.recipientName}\nRecipient phone: ${order.recipientPhone}\nDelivery date: ${order.deliveryDate}\nRegion: ${order.region}\nPin URL: ${order.deliveryPinUrl || 'Not provided'}\nCoordinates: ${order.deliveryLatitude ?? 'N/A'}, ${order.deliveryLongitude ?? 'N/A'}\nCustomer email: ${order.email}\nNote: ${order.note || 'N/A'}\n\nVisit ${siteUrl}${footerTextBlock}`,
      htmlBody: `<div style="font-family:Arial,sans-serif;color:#231f20;"><h2>Order received successfully</h2>${introHtml}<p><strong>Order reference:</strong> ${escapeHtml(order.id)}</p><h3>Ordered items</h3>${orderedItemsHtml}<p><strong>Subtotal:</strong> ${hasPriceData ? `UGX ${formatUgx(computedTotal)}` : 'N/A'}</p><p><strong>Total:</strong> ${totalWithDeliveryText}</p><h3>Delivery/contact details</h3><ul><li><strong>Recipient name:</strong> ${escapeHtml(order.recipientName)}</li><li><strong>Recipient phone:</strong> ${escapeHtml(order.recipientPhone)}</li><li><strong>Delivery date:</strong> ${escapeHtml(order.deliveryDate)}</li><li><strong>Region:</strong> ${escapeHtml(order.region)}</li><li><strong>Pin URL:</strong> ${pinUrlHtml}</li><li><strong>Coordinates:</strong> ${order.deliveryLatitude ?? 'N/A'}, ${order.deliveryLongitude ?? 'N/A'}</li><li><strong>Customer email:</strong> ${escapeHtml(order.email)}</li><li><strong>Note:</strong> ${escapeHtml(order.note || 'N/A')}</li></ul><p><a href="${escapeHtml(siteUrl)}">Return to SuperFastFlowers</a></p>${footerHtml}</div>`
    };
  };

  console.info('[ORDER_EMAIL_START] SES send starting', {
    orderId: order.id,
    customerEmail: order.email || null,
    sesFromEmailExists: true,
    awsRegion,
    sesClientRegion: sesClientResolvedRegion,
    usesAwsRegionEnv: Boolean(awsRegionFromEnv)
  });

  if (order.email) {
    const customerBodies = buildEmailBodies(
      'Hello Customer\n\nYou have made a succesful order.',
      '<p>Hello Customer</p><p>You have made a succesful order.</p>'
    );

    await sendSingleOrderEmail({
      sesClient,
      fromEmail,
      toEmail: order.email,
      subject: 'Order received successfully',
      textBody: customerBodies.textBody,
      htmlBody: customerBodies.htmlBody,
      orderId: order.id
    });
  }

  const vendorEmails = Array.from(new Set(lines.map((line) => line.vendorEmail?.trim()).filter((email): email is string => Boolean(email))));
  for (const vendorEmail of vendorEmails) {
    const vendorBodies = buildEmailBodies(
      'Hello Vendor,\n\nA successful order has been received.',
      '<p>Hello Vendor,</p><p>A successful order has been received.</p>',
      'You have received this mail because you are a vendor of this product(s)'
    );

    await sendSingleOrderEmail({
      sesClient,
      fromEmail,
      toEmail: vendorEmail,
      subject: `New successful order ${order.id}`,
      textBody: vendorBodies.textBody,
      htmlBody: vendorBodies.htmlBody,
      orderId: order.id
    });
  }

  const ownerBodies = buildEmailBodies(
    'Hello Platform Owner,\n\nA successful order has been received.',
    '<p>Hello Platform Owner,</p><p>A successful order has been received.</p>',
    'You have received this email as the owner of the platform'
  );

  await sendSingleOrderEmail({
    sesClient,
    fromEmail,
    toEmail: 'support@sendagift.ug',
    subject: `New platform order ${order.id}`,
    textBody: ownerBodies.textBody,
    htmlBody: ownerBodies.htmlBody,
    orderId: order.id
  });
}
