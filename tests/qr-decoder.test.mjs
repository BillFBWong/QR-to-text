import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { inflateSync } from 'node:zlib';
import { createQRDecoder } from '../extension/qr-decoder.js';

const fixture = readFileSync(new URL('./fixtures/healthcheck.png', import.meta.url));
const expected = 'QR-to-text-healthcheck-20261022';
const upload = new Blob([fixture], { type: 'image/png' });
// Load the exact standalone bundle used by Chrome, without Node's package loader.
const browserGlobal = {};
runInNewContext(readFileSync(new URL('../extension/vendor/jsQR.js', import.meta.url), 'utf8'), browserGlobal);
const decode = createQRDecoder(browserGlobal.jsQR);

// This fixture is an indexed, 1-bit PNG with unfiltered rows. Expand its real
// pixels using built-in APIs so the tests need no image library or network.
function fixturePixels() {
  const width = fixture.readUInt32BE(16);
  const height = fixture.readUInt32BE(20);
  assert.equal(fixture[24], 1);
  assert.equal(fixture[25], 3);
  const chunks = [];
  let palette;
  for (let offset = 8; offset < fixture.length;) {
    const length = fixture.readUInt32BE(offset);
    const type = fixture.toString('ascii', offset + 4, offset + 8);
    const bytes = fixture.subarray(offset + 8, offset + 8 + length);
    if (type === 'PLTE') palette = bytes;
    if (type === 'IDAT') chunks.push(bytes);
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = Math.ceil(width / 8) + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * stride], 0);
    for (let x = 0; x < width; x++) {
      const color = (raw[y * stride + 1 + (x >> 3)] >> (7 - (x % 8))) & 1;
      const pixel = (y * width + x) * 4;
      data.set([...palette.subarray(color * 3, color * 3 + 3), 255], pixel);
    }
  }
  return { data, width, height };
}

const pixels = fixturePixels();
const blank = { ...pixels, data: new Uint8ClampedArray(pixels.data.length).fill(255) };

function browser(t, { image = pixels, Detector, fetch = async () => { throw new Error('Network is offline'); }, imageError = false, pngBlob = upload } = {}) {
  const originals = new Map();
  const globals = {
    Image: class {
      naturalWidth = image.width;
      naturalHeight = image.height;
      set src(_) { imageError ? this.onerror() : this.onload(); }
    },
    document: {
      createElement: () => ({
        getContext: () => ({ drawImage() {}, getImageData: () => image }),
        toBlob: callback => callback(pngBlob)
      })
    },
    BarcodeDetector: Detector,
    fetch
  };
  for (const [name, value] of Object.entries(globals)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
}

test('clean QR decodes offline with no native BarcodeDetector', async t => {
  let requests = 0;
  browser(t, { fetch: async () => { requests++; throw new Error('offline'); } });
  assert.deepEqual(await decode('blob:test', upload), { data: expected, error: null });
  assert.equal(requests, 0);
});

test('inverted QR also decodes locally', async t => {
  const inverted = new Uint8ClampedArray(pixels.data);
  for (let i = 0; i < inverted.length; i++) {
    if (i % 4 !== 3) inverted[i] = 255 - inverted[i];
  }
  browser(t, { image: { ...pixels, data: inverted } });
  assert.deepEqual(await decode('blob:test', upload), { data: expected, error: null });
});

test('jsQR works when the native detector supports no QR format', async t => {
  browser(t, { Detector: class { static async getSupportedFormats() { return []; } } });
  assert.deepEqual(await decode('blob:test', upload), { data: expected, error: null });
});

test('jsQR works when the native detector fails', async t => {
  t.mock.method(console, 'warn', () => {});
  browser(t, { Detector: class { static async getSupportedFormats() { throw new Error('unsupported'); } } });
  assert.deepEqual(await decode('blob:test', upload), { data: expected, error: null });
});

test('native decoding still succeeds before either fallback', async t => {
  browser(t, { Detector: class {
    static async getSupportedFormats() { return ['qr_code']; }
    async detect() { return [{ rawValue: expected }]; }
  } });
  const nativeOnly = createQRDecoder(() => assert.fail('jsQR should not run'));
  assert.deepEqual(await nativeOnly('blob:test', upload), { data: expected, error: null });
});

test('bad image reports an image load error', async t => {
  browser(t, { imageError: true });
  assert.match((await decode('blob:test', upload)).error, /corrupted, unreadable/);
});

for (const [name, response, message] of [
  ['HTTP 403', () => new Response('Multipart requests are disabled.', { status: 403 }), /unavailable \(HTTP 403\)/],
  ['no QR found', () => Response.json([{ symbol: [{ data: null, error: 'could not find or decode QR code' }] }]), /^No QR code found/],
  ['provider failure', () => Response.json([{ symbol: [{ data: null, error: 'download error (could not establish connection)' }] }]), /service could not process.*download error/],
  ['malformed JSON', () => new Response('<html>Service error</html>'), /invalid response/],
  ['unexpected response shape', () => Response.json({ error: 'unavailable' }), /invalid response/]
]) {
  test(`remote ${name} is reported accurately`, async t => {
    browser(t, { image: blank, fetch: async () => response() });
    const result = await decode('blob:test', upload);
    assert.equal(result.data, null);
    assert.match(result.error, message);
  });
}

test('network failure is not reported as a blurry image', async t => {
  browser(t, { image: blank });
  assert.match((await decode('blob:test', upload)).error, /Could not reach the QR decoding service/);
});

test('remote success still returns the decoded payload', async t => {
  browser(t, { image: blank, fetch: async () => Response.json([{ symbol: [{ data: expected, error: null }] }]) });
  assert.deepEqual(await decode('blob:test', upload), { data: expected, error: null });
});

test('WebP is converted to PNG before remote upload', async t => {
  let sent;
  browser(t, { image: blank, fetch: async (_url, options) => {
    sent = options.body.get('file');
    return Response.json([{ symbol: [{ data: expected, error: null }] }]);
  } });
  assert.equal((await decode('blob:test', new Blob(['webp'], { type: 'image/webp' }))).data, expected);
  assert.equal(sent.type, 'image/png');
  assert.deepEqual(Buffer.from(await sent.arrayBuffer()), fixture);
});

test('oversized images do not make an unsupported API upload', async t => {
  let requests = 0;
  const large = new Blob([new Uint8Array(1024 * 1024)], { type: 'image/png' });
  browser(t, { image: blank, pngBlob: large, fetch: async () => { requests++; } });
  assert.match((await decode('blob:test', large)).error, /1 MiB size limit/);
  assert.equal(requests, 0);
});

test('a stalled API call is aborted after 15 seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requestStarted;
  const started = new Promise(resolve => { requestStarted = resolve; });
  browser(t, { image: blank, fetch: async (_url, { signal }) => {
    requestStarted();
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  } });
  const pending = decode('blob:test', upload);
  await started;
  t.mock.timers.tick(15000);
  assert.match((await pending).error, /timed out/);
});
