import { readFile } from 'node:fs/promises';

// Only the checked-in synthetic fixture is uploaded; never a user's QR image.
const fixture = await readFile(new URL('../tests/fixtures/healthcheck.png', import.meta.url));
const form = new FormData();
form.append('file', new Blob([fixture], { type: 'image/png' }), 'healthcheck.png');
const started = Date.now();
try {
  const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
    method: 'POST', body: form, signal: AbortSignal.timeout(15000)
  });
  const body = await response.text();
  console.log(JSON.stringify({ status: response.status, elapsedMs: Date.now() - started, body }, null, 2));
  const json = response.ok && JSON.parse(body);
  if (json?.[0]?.symbol?.[0]?.data !== 'QR-to-text-healthcheck-20261022') process.exitCode = 1;
} catch (error) {
  console.error('QR API health check failed:', error.message);
  process.exitCode = 1;
}
