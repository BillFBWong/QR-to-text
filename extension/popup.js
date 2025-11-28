// Elements
const views = {
  upload: document.getElementById('upload-view'),
  loading: document.getElementById('loading-view'),
  result: document.getElementById('result-view'),
  error: document.getElementById('error-view')
};

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const resultText = document.getElementById('result-text');
const resultThumb = document.getElementById('result-thumb');
const charCount = document.getElementById('char-count');
const btnCopy = document.getElementById('btn-copy');
const btnAction = document.getElementById('btn-action');
const btnRetry = document.getElementById('btn-retry');
const errorMsg = document.getElementById('error-msg');
const actionText = document.getElementById('action-text');

// State
let currentText = '';

// --- Navigation ---
function showView(viewName) {
  Object.values(views).forEach(el => el.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
}

function resetApp() {
  currentText = '';
  fileInput.value = '';
  showView('upload');
}

// --- Image Processing ---
async function processFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showError("Invalid file type. Please upload an image.");
    return;
  }

  showView('loading');
  const objectUrl = URL.createObjectURL(file);

  try {
    const data = await decodeQR(objectUrl, file);
    if (data) {
      showResult(data, objectUrl);
    } else {
      showError("Could not detect a QR code. Try a clearer image.");
    }
  } catch (e) {
    console.error(e);
    showError("An error occurred during decoding.");
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  showView('error');
}

function showResult(text, imageUrl) {
  currentText = text;
  resultText.value = text;
  resultThumb.src = imageUrl;
  charCount.textContent = `${text.length} chars`;
  
  // Update Action Button based on content
  const isUrl = isValidUrl(text);
  if (isUrl) {
    btnAction.className = 'btn-primary';
    btnAction.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
      <span>Open Link</span>
    `;
    btnAction.onclick = () => window.open(text, '_blank');
  } else {
    btnAction.className = 'btn-secondary';
    btnAction.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      <span>Scan New</span>
    `;
    btnAction.onclick = resetApp;
  }
  
  showView('result');
}

function isValidUrl(string) {
  try { new URL(string); return true; } catch (_) { return false; }
}

// --- Decoding Logic (Native + API Fallback) ---
async function decodeQR(src, fileBlob) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = src;
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // 1. Try Native BarcodeDetector (Chrome built-in)
  // Check if API exists and supports 'qr_code'
  if ('BarcodeDetector' in window) {
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(img);
        if (codes.length > 0) return codes[0].rawValue;
      }
    } catch (e) {
      console.warn("Native detection failed or rejected", e);
    }
  }

  // 2. Fallback to API (qrserver.com)
  try {
    const formData = new FormData();
    formData.append('file', fileBlob);

    const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const json = await response.json();
      if (json?.[0]?.symbol?.[0]?.data) {
        return json[0].symbol[0].data;
      }
    }
  } catch (e) {
    console.warn("API fallback failed", e);
  }

  return null;
}

// --- Event Listeners ---

// 1. Drag & Drop
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => processFile(e.target.files[0]));

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#6366f1';
  dropArea.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
});

dropArea.addEventListener('dragleave', () => {
  dropArea.style.borderColor = '#334155';
  dropArea.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#334155';
  dropArea.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
});

// 2. Paste
document.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      processFile(file);
      break;
    }
  }
});

// 3. Result Actions
btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(currentText);
  const originalHtml = btnCopy.innerHTML;
  btnCopy.innerHTML = `<span style="color:#4ade80">Copied!</span>`;
  setTimeout(() => {
    btnCopy.innerHTML = originalHtml;
  }, 1500);
});

btnRetry.addEventListener('click', resetApp);

// 4. Initialize from URL Param (Context Menu)
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const src = params.get('src');
  if (src) {
    showView('loading');
    fetch(src)
      .then(res => res.blob())
      .then(blob => processFile(new File([blob], "scan.png", { type: blob.type })))
      .catch((e) => {
        console.error(e);
        showError("Failed to load image from context menu.");
      });
  }
});