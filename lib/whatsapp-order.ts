import { STORE_PHONE } from '@/lib/seo';
import { deliveryAreas } from '@/lib/delivery-areas';
import { formatUgx } from '@/lib/format';
import { getFlavourLabel } from '@/lib/flavours';
import { formatCustomization } from '@/lib/customization';
import type { CartItem } from '@/lib/cart-storage';

type WhatsAppOrderDetails = {
  orderId?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  form: FormData;
};

function field(form: FormData, name: string) {
  return String(form.get(name) || '').trim();
}

// Builds the wa.me link for customers who would rather confirm and pay over
// WhatsApp than through Pesapal. Everything typed at checkout goes in the message
// so staff never have to ask for it again.
export function buildWhatsAppOrderUrl({ orderId, items, subtotal, deliveryFee, form }: WhatsAppOrderDetails) {
  const cityId = field(form, 'cityId');
  const areaLabel = cityId && cityId !== 'delivery-pin' ? deliveryAreas.find((area) => area.value === cityId)?.label : '';
  const address = [field(form, 'region'), areaLabel].filter(Boolean).join(', ');
  const pinUrl = field(form, 'deliveryPinUrl');
  const note = field(form, 'note');
  const customerPhone = field(form, 'customerPhone');

  const itemLines = items.map((item) => {
    const extras = [
      item.flavour ? getFlavourLabel(item.flavour) : '',
      item.isAddon ? 'Add-on' : '',
      item.message ? `Message: "${item.message}"` : '',
      ...(item.customizations || []).map(formatCustomization)
    ].filter(Boolean);
    return `• ${item.quantity} x ${item.name}${extras.length ? ` (${extras.join(', ')})` : ''} - UGX ${formatUgx(item.price * item.quantity)}`;
  });

  const lines = [
    "Hello Sendagift UG, I'd like to place this order:",
    orderId ? `Order reference: ${orderId}` : '',
    '',
    ...itemLines,
    '',
    `Subtotal: UGX ${formatUgx(subtotal)}`,
    deliveryFee > 0 ? `Delivery fee: UGX ${formatUgx(deliveryFee)}` : '',
    `Total: UGX ${formatUgx(subtotal + deliveryFee)}`,
    '',
    `Recipient: ${field(form, 'recipientName')}`,
    `Recipient phone: ${field(form, 'recipientPhone')}`,
    `Delivery date: ${field(form, 'deliveryDate')}`,
    address ? `Delivery address: ${address}` : '',
    pinUrl ? `Map pin: ${pinUrl}` : '',
    note ? `Note: ${note}` : '',
    '',
    `My email: ${field(form, 'email')}`,
    customerPhone ? `My phone: ${customerPhone}` : ''
  ];

  const text = lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n').replace(/\n{3,}/g, '\n\n');
  return `https://wa.me/${STORE_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
