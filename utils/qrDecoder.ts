import jsQR from 'jsqr';

// Type definitions for the experimental BarcodeDetector API
interface BarcodeDetectorOptions {
  formats: string[];
}

interface DetectedBarcode {
  rawValue: string;
  boundingBox: DOMRectReadOnly;
  format: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

export const decodeQRCode = async (
  imageSrc: string
): Promise<{ data: string | null; error: string | null }> => {
  // Create an image element to load the source
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = imageSrc;

  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      // Triggers if the source is not a valid image or cannot be loaded
      img.onerror = () => reject(new Error("Image load error"));
    });
  } catch (e) {
    return { data: null, error: "The file is corrupted, unreadable, or not a valid image." };
  }

  // STRATEGY 1: Native BarcodeDetector (Chrome/Edge/Android)
  // This is much more robust for "stylish" or damaged QR codes than jsQR
  if ('BarcodeDetector' in window) {
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(img);
        
        if (codes.length > 0) {
          return { data: codes[0].rawValue, error: null };
        } else {
          console.log("Native detector found no codes, trying fallback...");
        }
      }
    } catch (e) {
      console.warn('BarcodeDetector failed or not supported, falling back to jsQR', e);
    }
  }

  // STRATEGY 2: jsQR (Pure JavaScript fallback)
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        return { data: code.data, error: null };
      }
    }
  } catch (e) {
    console.error("jsQR decoding failed:", e);
  }

  // STRATEGY 3: Remote API (api.qrserver.com)
  // This handles files that local libraries might miss (e.g. very specific damage or encoding).
  // Note: We use POST because the image is a local blob, not a public URL.
  try {
    console.log("Local decoding failed. Trying remote API...");
    
    // Fetch the blob from the local object URL
    const blobResponse = await fetch(imageSrc);
    const blob = await blobResponse.blob();

    const formData = new FormData();
    formData.append('file', blob);

    const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const json = await response.json();
      // API format: [{ type: "qrcode", symbol: [{ seq: 0, data: "...", error: null }] }]
      if (Array.isArray(json) && json.length > 0) {
        const symbols = json[0].symbol;
        if (Array.isArray(symbols) && symbols.length > 0) {
           const result = symbols[0];
           if (result.data) {
             return { data: result.data, error: null };
           }
        }
      }
    }
  } catch (e) {
    console.warn("Remote API fallback failed:", e);
  }

  return { data: null, error: "No QR code found in the image." };
};