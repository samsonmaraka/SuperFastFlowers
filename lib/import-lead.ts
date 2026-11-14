import { z } from 'zod';

// "Need help importing a car?" requests from the DriveCar Uganda tax calculator
// (www.drivecar.ug). That site is static, so it posts here and SendAGift emails
// the request using its existing SES sender.

export const IMPORT_LEAD_ALERT_EMAIL_DEFAULT = 'support@sendagift.ug';

export const IMPORT_LEAD_DEFAULT_ORIGINS = ['https://www.drivecar.ug', 'https://drivecar.ug'];

export const importLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  phone: z.string().trim().min(5, 'Phone number is required.').max(40),
  email: z.string().trim().email('A valid email address is required.').max(200),
  message: z.string().trim().min(1, 'Message is required.').max(3000),
  pagePath: z.string().trim().max(300).optional(),
  createdAt: z.string().trim().max(60).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(500).optional()
});

export type ImportLead = z.infer<typeof importLeadSchema>;

export function getAllowedImportLeadOrigins(envValue = process.env.IMPORT_LEAD_ALLOWED_ORIGINS || ''): string[] {
  const fromEnv = envValue
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return fromEnv.length ? fromEnv : IMPORT_LEAD_DEFAULT_ORIGINS;
}

export function isAllowedImportLeadOrigin(origin: string | null, allowed = getAllowedImportLeadOrigins()) {
  return Boolean(origin) && allowed.includes(String(origin).replace(/\/$/, ''));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function kampalaTime(iso: string | undefined, fallback: Date) {
  const date = iso ? new Date(iso) : fallback;
  const valid = Number.isNaN(date.getTime()) ? fallback : date;
  return `${valid.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' })} (Kampala time)`;
}

export function buildImportLeadEmail(lead: ImportLead, now = new Date()) {
  const details: Array<[string, string]> = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Submitted', kampalaTime(lead.createdAt, now)],
    ['Page', `https://www.drivecar.ug${lead.pagePath || '/help_importing_car/'}`]
  ];

  const whatsappNumber = lead.phone.replace(/[^\d]/g, '');
  const subject = `Car import request from ${lead.name.replace(/[\r\n]+/g, ' ').slice(0, 80)}`;

  const textBody = `New "Need help importing a car?" request\n\n${details
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')}\n\nWhat they need:\n${lead.message}\n\nReply to this email to answer ${lead.name} directly.`;

  const htmlBody = `<div style="font-family:Arial,sans-serif;color:#231f20;"><h2>New car import request</h2><p>Someone filled in the <strong>Need help importing a car?</strong> form on DriveCar Uganda.</p><ul>${details
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')}</ul><h3>What they need</h3><p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml(lead.message)}</p><p>Reply to this email to answer ${escapeHtml(lead.name)} directly${whatsappNumber ? `, or <a href="https://wa.me/${whatsappNumber}">message them on WhatsApp</a>` : ''}.</p></div>`;

  return { subject, textBody, htmlBody };
}
