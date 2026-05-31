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

export type PesapalSafeDiagnostics = {
  authUrl?: string;
  env: {
    PESAPAL_BASE_URL: boolean;
    PESAPAL_CONSUMER_KEY: boolean;
    PESAPAL_CONSUMER_SECRET: boolean;
    PESAPAL_IPN_ID: boolean;
    NEXT_PUBLIC_SITE_URL: boolean;
  };
  httpStatus?: number;
  pesapalStatus?: string;
  pesapalMessage?: string;
  pesapalError?: unknown;
};

export class PesapalError extends Error {
  status?: number;
  details?: unknown;
  safeDiagnostics?: PesapalSafeDiagnostics;

  constructor(message: string, options?: { status?: number; details?: unknown; safeDiagnostics?: PesapalSafeDiagnostics }) {
    super(message);
    this.name = 'PesapalError';
    this.status = options?.status;
    this.details = options?.details;
    this.safeDiagnostics = options?.safeDiagnostics;
  }
}

export function getPesapalEnvPresence() {
  const env = getEnv();
  return {
    PESAPAL_BASE_URL: Boolean(env.pesapalBaseUrl),
    PESAPAL_CONSUMER_KEY: Boolean(env.pesapalConsumerKey),
    PESAPAL_CONSUMER_SECRET: Boolean(env.pesapalConsumerSecret),
    PESAPAL_IPN_ID: Boolean(env.pesapalIpnId),
    NEXT_PUBLIC_SITE_URL: Boolean(env.siteUrl)
  };
}

function safePesapalDiagnostics(options?: {
  authUrl?: string;
  httpStatus?: number;
  data?: Pick<PesapalTokenResponse, 'error' | 'message' | 'status'>;
}): PesapalSafeDiagnostics {
  return {
    authUrl: options?.authUrl,
    env: getPesapalEnvPresence(),
    httpStatus: options?.httpStatus,
    pesapalStatus: options?.data?.status,
    pesapalMessage: options?.data?.message,
    pesapalError: options?.data?.error
  };
}

function logPesapalAuthDiagnostics(label: string, diagnostics: PesapalSafeDiagnostics) {
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
      safeDiagnostics: safePesapalDiagnostics()
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

function normalizePesapalBaseUrl(baseUrl: string) {
  return baseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/Auth\/RequestToken$/i, '')
    .replace(/\/api\/URLSetup\/RegisterIPN$/i, '')
    .replace(/\/api\/Transactions\/SubmitOrderRequest$/i, '')
    .replace(/\/api\/Transactions\/GetTransactionStatus$/i, '');
}

export function buildPesapalUrl(path: string) {
  const env = getEnv();
  const normalizedBaseUrl = normalizePesapalBaseUrl(env.pesapalBaseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
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
  const safeDiagnostics = safePesapalDiagnostics({ authUrl, httpStatus: response.status, data });

  logPesapalAuthDiagnostics('[PESAPAL_AUTH_RESPONSE]', safeDiagnostics);

  if (response.status !== 200 || !data.token) {
    throw new PesapalError('Pesapal authentication failed.', {
      status: response.status,
      details: data,
      safeDiagnostics
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
    throw new PesapalError('Pesapal IPN registration failed.', { status: response.status, details: data });
  }

  return data;
}

export async function submitPesapalOrder({ order, merchantReference, amount }: PesapalSubmitOrderInput) {
  const env = requirePesapalEnv();
  if (!env.pesapalIpnId) {
    throw new PesapalError('Pesapal IPN registration is required before checkout. Register the IPN URL and set PESAPAL_IPN_ID to the returned ipn_id.', {
      safeDiagnostics: safePesapalDiagnostics()
    });
  }

  const token = await getPesapalToken();
  const deliveryArea = order.cityId === 'delivery-pin' ? order.region : order.cityId;
  const response = await fetch(buildPesapalUrl('/api/Transactions/SubmitOrderRequest'), {
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
        line_1: deliveryArea,
        city: deliveryArea,
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
