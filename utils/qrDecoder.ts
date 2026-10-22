import jsQR from 'jsqr';
import { createQRDecoder } from '../extension/qr-decoder.js';

export const decodeQRCode: (
  imageSrc: string
) => Promise<{ data: string | null; error: string | null }> = createQRDecoder(jsQR);
