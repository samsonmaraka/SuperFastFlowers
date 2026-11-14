import assert from 'node:assert/strict';
import { buildImportLeadEmail, getAllowedImportLeadOrigins, importLeadSchema, isAllowedImportLeadOrigin } from '../lib/import-lead';

const valid = { name: 'Jane Doe', phone: '+256 700 000000', email: 'jane@example.com', message: 'I want a 2016 Rumion' };

// Valid form submissions parse; missing or bad fields are rejected.
assert.equal(importLeadSchema.safeParse(valid).success, true);
assert.equal(importLeadSchema.safeParse({ ...valid, email: 'nope' }).success, false);
assert.equal(importLeadSchema.safeParse({ ...valid, message: '   ' }).success, false);

// Only DriveCar origins are allowed by default; the env var overrides the list.
assert.equal(isAllowedImportLeadOrigin('https://www.drivecar.ug'), true);
assert.equal(isAllowedImportLeadOrigin('https://evil.example'), false);
assert.equal(isAllowedImportLeadOrigin(null), false);
assert.deepEqual(getAllowedImportLeadOrigins(' https://a.test/, https://b.test '), ['https://a.test', 'https://b.test']);

// The email carries every form field and escapes HTML in what visitors typed.
const email = buildImportLeadEmail(
  { ...valid, message: '<script>x</script> Rumion', createdAt: '2026-11-14T09:00:00.000Z', pagePath: '/help_importing_car/' },
  new Date('2026-11-14T09:00:00.000Z')
);
assert.equal(email.subject, 'Car import request from Jane Doe');
for (const value of [valid.name, valid.phone, valid.email, 'Rumion', '12:00 (Kampala time)']) {
  assert.ok(email.textBody.includes(value), `text body should include ${value}`);
}
assert.ok(email.htmlBody.includes('&lt;script&gt;x&lt;/script&gt;'));
assert.ok(!email.htmlBody.includes('<script>'));
assert.ok(email.htmlBody.includes('https://wa.me/256700000000'));

// Newlines in the name cannot inject extra email headers via the subject.
assert.ok(!buildImportLeadEmail({ ...valid, name: 'A\r\nBcc: x@y.z' }).subject.includes('\n'));

console.log('import-lead tests passed');
