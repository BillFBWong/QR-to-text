const READ_QR_URL = 'https://api.qrserver.com/v1/read-qr-code/';
const REMOTE_TIMEOUT_MS = 15000;
const MAX_UPLOAD_BYTES = 1024 * 1024;
const NO_CODE = 'No QR code found in the image. Try another image.';

// Share the decoding pipeline between the web app and standalone extension.
// Pass in bundled jsQR so extension pages need no CDN access.
export function createQRDecoder(jsQR) {
  return async function decodeQRCode(imageSrc, fileBlob = null) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Image load error'));
        img.src = imageSrc;
      });
    } catch {
      return { data: null, error: 'The file is corrupted, unreadable, or not a valid image.' };
    }

    const Detector = globalThis.BarcodeDetector;
    if (Detector) {
      try {
        const formats = await Detector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          const codes = await new Detector({ formats: ['qr_code'] }).detect(img);
          const code = codes.find(code => code.rawValue);
          if (code) return { data: code.rawValue, error: null };
        }
      } catch (error) {
        console.warn('Native QR detection failed; trying jsQR.', error);
      }
    }

    let canvas;
    try {
      canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(pixels.data, pixels.width, pixels.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code?.data) return { data: code.data, error: null };
      }
    } catch (error) {
      console.warn('Local QR decoding failed; trying the remote service.', error);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    try {
      let blob = fileBlob;
      if (!blob) {
        const source = await fetch(imageSrc, { signal: controller.signal });
        if (!source.ok) throw new Error('Could not load the source image');
        blob = await source.blob();
      }

      // The API accepts PNG, GIF and JPEG files smaller than 1 MiB.
      if (!['image/png', 'image/gif', 'image/jpeg'].includes(blob.type) || blob.size >= MAX_UPLOAD_BYTES) {
        blob = canvas && await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob || blob.size >= MAX_UPLOAD_BYTES) {
          return { data: null, error: 'Local decoding found no QR code, and the image exceeds the remote service\'s format or 1 MiB size limit.' };
        }
      }

      const form = new FormData();
      const extension = { 'image/png': 'png', 'image/gif': 'gif', 'image/jpeg': 'jpg' }[blob.type];
      form.append('file', blob, 'qr-image.' + extension);
      const response = await fetch(READ_QR_URL, {
        method: 'POST', body: form, signal: controller.signal
      });
      if (!response.ok) {
        return { data: null, error: `The QR decoding service is unavailable (HTTP ${response.status}). Local decoding found no QR code. Please try again later.` };
      }

      const json = await response.json();
      const symbols = Array.isArray(json)
        ? json.flatMap(item => Array.isArray(item?.symbol) ? item.symbol : [])
        : [];
      const decoded = symbols.find(symbol => !symbol?.error && typeof symbol?.data === 'string' && symbol.data.length > 0);
      if (decoded) return { data: decoded.data, error: null };

      const serviceError = symbols.find(symbol => typeof symbol?.error === 'string' && symbol.error)?.error;
      if (serviceError) {
        if (serviceError.toLowerCase().includes('could not find or decode qr code')) {
          return { data: null, error: NO_CODE };
        }
        return { data: null, error: `The QR decoding service could not process the image: ${serviceError}` };
      }
      return { data: null, error: 'The QR decoding service returned an invalid response. Please try again later.' };
    } catch (error) {
      if (controller.signal.aborted) {
        return { data: null, error: 'The QR decoding service timed out. Please try again later.' };
      }
      if (error instanceof SyntaxError) {
        return { data: null, error: 'The QR decoding service returned an invalid response. Please try again later.' };
      }
      return { data: null, error: 'Could not reach the QR decoding service. Check your connection and try again.' };
    } finally {
      clearTimeout(timeout);
    }
  };
}
