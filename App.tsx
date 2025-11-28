import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Scan, AlertCircle, Loader2 } from 'lucide-react';
import { AppState, AnalysisStatus } from './types';
import { decodeQRCode } from './utils/qrDecoder';
import ResultView from './components/ResultView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: AnalysisStatus.IDLE,
    qrData: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetApp = () => {
    setState({
      status: AnalysisStatus.IDLE,
      qrData: null,
      error: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImage = useCallback(async (file: File) => {
    if (!file) return;

    // Strict file type validation
    if (!file.type.startsWith('image/')) {
      setState(prev => ({
        ...prev,
        status: AnalysisStatus.ERROR,
        error: "Invalid file type. Please upload an image (JPG, PNG, WEBP).",
      }));
      return;
    }

    setState(prev => ({ ...prev, status: AnalysisStatus.DECODING, error: null }));

    try {
      const objectUrl = URL.createObjectURL(file);
      
      // Use the updated decoder which tries Native BarcodeDetector first, then jsQR
      const { data, error } = await decodeQRCode(objectUrl);

      if (data) {
        setState(prev => ({
          ...prev,
          status: AnalysisStatus.COMPLETE,
          qrData: { rawText: data, imageSrc: objectUrl },
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: AnalysisStatus.ERROR,
          error: error || "Could not detect a QR code. The image might be too blurry or the code is invalid.",
        }));
        // Only revoke if we failed, otherwise ResultView needs the URL
        URL.revokeObjectURL(objectUrl);
      }

    } catch (err) {
      console.error(err);
      setState(prev => ({
        ...prev,
        status: AnalysisStatus.ERROR,
        error: "An unexpected error occurred during processing.",
      }));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) processImage(file);
        break;
      }
    }
  }, [processImage]);

  return (
    <div 
      className="min-h-screen bg-slate-950 flex items-center justify-center p-4"
      onPaste={handlePaste}
    >
      {/* Extension-like Container */}
      <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col h-[500px]">
        
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <Scan size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight">QR To Text</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          
          {state.status === AnalysisStatus.IDLE && (
             <div 
               className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
               onClick={() => fileInputRef.current?.click()}
               onDragOver={(e) => e.preventDefault()}
               onDrop={handleDrop}
             >
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
               />
               
               <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                  <Upload className="text-indigo-400" size={28} />
               </div>
               
               <h3 className="text-slate-200 font-semibold mb-1">Select QR Image</h3>
               <p className="text-slate-500 text-sm text-center max-w-[200px]">
                 Drag & drop or Paste (Ctrl+V)
               </p>

               <div className="absolute bottom-6 flex items-center gap-2 text-xs text-slate-600 bg-slate-900/80 px-3 py-1.5 rounded-full">
                 <ImageIcon size={12} />
                 <span>JPG, PNG, WEBP</span>
               </div>
             </div>
          )}

          {state.status === AnalysisStatus.DECODING && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={24} className="text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Decoding...
                </h3>
              </div>
            </div>
          )}

          {state.status === AnalysisStatus.COMPLETE && state.qrData && (
            <ResultView 
              qrData={state.qrData} 
              onReset={resetApp} 
            />
          )}

          {state.status === AnalysisStatus.ERROR && (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Read</h3>
              <p className="text-red-400/80 text-sm mb-6 max-w-[250px]">
                {state.error}
              </p>
              <button 
                onClick={resetApp}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;