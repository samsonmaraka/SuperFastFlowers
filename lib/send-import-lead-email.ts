import 'server-only';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getEnv } from '@/lib/env';
import { buildImportLeadEmail, IMPORT_LEAD_ALERT_EMAIL_DEFAULT, type ImportLead } from '@/lib/import-lead';

export async function sendImportLeadEmail(lead: ImportLead) {
  const fromEmail = process.env.SES_FROM_EMAIL;
  const toEmail = process.env.IMPORT_LEAD_ALERT_EMAIL || IMPORT_LEAD_ALERT_EMAIL_DEFAULT;
  if (!fromEmail) throw new Error('SES_FROM_EMAIL is missing; cannot send car import request email.');

  const { subject, textBody, htmlBody } = buildImportLeadEmail(lead);
  const sesClient = new SESClient({ region: process.env.AWS_REGION || getEnv().awsRegion });

  const result = await sesClient.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: toEmail.split(',').map((address) => address.trim()).filter(Boolean) },
      ReplyToAddresses: [lead.email],
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: textBody, Charset: 'UTF-8' },
          Html: { Data: htmlBody, Charset: 'UTF-8' }
        }
      }
    })
  );

  console.info('[IMPORT_LEAD_EMAIL_SUCCESS] SES send completed', { messageId: result.MessageId || null });
}
