<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# QR to Text - Instant QR Code Decoder

A high-performance, privacy-focused tool to instantly convert QR code images into text or URLs. Available as a modern Web Application and a standalone Chrome Extension.

## ✨ Features

- **🚀 Zero Latency:** Uses the browser's native `BarcodeDetector` API for instant, client-side decoding.
- **🛡️ Robust Fallback:** Both the web app and extension bundle jsQR for offline decoding when native detection is unavailable. A remote API (`api.qrserver.com`) is tried only if both local decoders fail; network and service errors are reported separately.
- **🎨 Modern Dark UI:** Designed with a "Black / Dim Red / Blood Orange" aesthetic for high contrast and visual appeal.
- **👆 Seamless Workflow:**
  - **Drag & Drop:** Drop images directly into the interface.
  - **Clipboard:** Paste images (Ctrl+V) anywhere to scan.
  - **Context Menu:** Right-click any image on the web to scan it immediately.
- **⚡ Smart Actions:** 
  - Auto-detects URLs for one-click opening.
  - "Auto-close" mode for high-speed workflows.

---

## 🧩 Chrome Extension Guide

The project includes a fully standalone Chrome Extension located in the `/extension` folder. It works independently of the React web app.

### Installation

1. **Download/Clone** this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on in the top right corner.
4. Click the **Load unpacked** button.
5. Select the **`extension`** folder from inside this project directory.

### Usage

- **Right-Click Scan:** Right-click on any QR code image on a website and select **"Scan QR Code"**. A floating utility window will open with the result.
- **Toolbar Action:** Click the extension icon in your browser toolbar to open the utility window. You can drag and drop local files or paste images here.
- **Auto-Close:** Check the "Close window after action" box to automatically close the popup when you click Copy or Open Link.

---

## 💻 Web Application

The root directory contains a React-based version of the tool, perfect for hosting as a static web app.

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Tech Stack

- **Framework:** React 19
- **Styling:** Tailwind CSS (Web) / Vanilla CSS Variables (Extension)
- **Icons:** Lucide React
- **Decoding:** Native `BarcodeDetector` API + bundled `jsQR` (Web and Extension) + Remote API (Final fallback)

### Decoder maintenance and checks

The standalone extension includes `extension/vendor/jsQR.js` and its license. After changing the pinned jsQR dependency, run `npm run sync:decoder` and include the updated bundle. Reload the extension at `chrome://extensions/` after updating its files.

- `npm test` checks offline decoding with a real QR fixture and API failure handling.
- `npm run build` builds the web app.
- `npm run check:api` uploads only the synthetic test fixture and exits unsuccessfully unless the remote API returns its exact payload.

The remote upload API accepts PNG, GIF or JPEG files smaller than 1 MiB ([provider documentation](https://goqr.me/api/doc/read-qr-code/)). Other formats are converted to PNG before upload when possible. Requests time out after 15 seconds. On 2026-10-22, an upload health check returned HTTP 403 (`Multipart requests are disabled.`), so remote decoding should not be relied on for availability.

---

## 🔒 Privacy

- **Local First:** The app attempts to decode everything locally in your browser using the Native Barcode API.
- **Fallback:** Only if local decoding fails, the image is sent securely to `api.qrserver.com` for processing. No images are stored permanently.
