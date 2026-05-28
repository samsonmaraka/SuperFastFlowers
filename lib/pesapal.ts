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

type PesapalTokenResponse = {
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

export class PesapalError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'PesapalError';
    this.status = options?.status;
    this.details = options?.details;
  }
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
    throw new PesapalError(`Missing Pesapal environment variables: ${missing.join(', ')}`);
  }

  return env;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PesapalError('Pesapal returned a non-JSON response.', { status: response.status, details: text });
  }
}

function pesapalHeaders(token?: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function getPesapalToken() {
  const env = requirePesapalEnv();
  const response = await fetch(`${env.pesapalBaseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: pesapalHeaders(),
    body: JSON.stringify({
      consumer_key: env.pesapalConsumerKey,
      consumer_secret: env.pesapalConsumerSecret
    }),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalTokenResponse>(response);

  if (!response.ok || !data.token) {
    throw new PesapalError('Pesapal authentication failed.', { status: response.status, details: data });
  }

  return data.token;
}

export async function registerPesapalIpn() {
  const env = requirePesapalEnv();
  const token = await getPesapalToken();
  const ipnUrl = `${env.siteUrl}/api/pesapal/ipn`;
  const response = await fetch(`${env.pesapalBaseUrl}/api/URLSetup/RegisterIPN`, {
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
    throw new PesapalError('Pesapal IPN registration failed.', { status: response.status, details: data });
  }

  return data;
}

export async function submitPesapalOrder({ order, merchantReference, amount }: PesapalSubmitOrderInput) {
  const env = requirePesapalEnv();
  if (!env.pesapalIpnId) {
    throw new PesapalError('Pesapal IPN registration is required before checkout. Register the IPN URL and set PESAPAL_IPN_ID to the returned ipn_id.');
  }

  const token = await getPesapalToken();
  const response = await fetch(`${env.pesapalBaseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: pesapalHeaders(token),
    body: JSON.stringify({
      id: merchantReference,
      currency: 'UGX',
      amount,
      description: 'Giftora order payment',
      callback_url: `${env.siteUrl}/payment/callback`,
      cancellation_url: `${env.siteUrl}/checkout`,
      notification_id: env.pesapalIpnId,
      billing_address: {
        email_address: order.email,
        phone_number: order.recipientPhone,
        first_name: order.recipientName,
        last_name: '',
        line_1: order.cityId,
        city: order.cityId,
        state: order.region,
        country_code: 'UG'
      }
    }),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalSubmitOrderResponse>(response);

  if (!response.ok || !data.order_tracking_id || !data.redirect_url) {
    throw new PesapalError('Pesapal order submission failed.', { status: response.status, details: data });
  }

  return data;
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  const env = requirePesapalEnv();
  if (!orderTrackingId) throw new PesapalError('Missing Pesapal order tracking ID.');

  const token = await getPesapalToken();
  const url = new URL(`${env.pesapalBaseUrl}/api/Transactions/GetTransactionStatus`);
  url.searchParams.set('orderTrackingId', orderTrackingId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: pesapalHeaders(token),
    cache: 'no-store'
  });
  const data = await readJsonResponse<PesapalTransactionStatus>(response);

  if (!response.ok) {
    throw new PesapalError('Pesapal transaction status lookup failed.', { status: response.status, details: data });
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
