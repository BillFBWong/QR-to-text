import React from 'react';
import { QRData } from '../types';
import { Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

interface ResultViewProps {
  qrData: QRData;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ qrData, onReset }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleOpenLink = () => {
    if (isUrl(qrData.rawText)) {
      window.open(qrData.rawText, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-4 mb-4">
        {/* Thumbnail of the source image */}
        <div className="w-16 h-16 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex-shrink-0">
          <img 
            src={qrData.imageSrc} 
            alt="Source QR" 
            className="w-full h-full object-cover opacity-80" 
          />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-white">Analysis Complete</h2>
          <p className="text-slate-400 text-sm">Successfully decoded</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex-1 flex flex-col mb-4 backdrop-blur-sm shadow-inner">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">Content</label>
          <span className="text-xs text-slate-500 font-mono">
            {qrData.rawText.length} chars
          </span>
        </div>
        
        <textarea 
          readOnly 
          className="flex-1 w-full bg-slate-900/50 text-slate-200 text-sm font-mono p-3 rounded-lg border border-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          value={qrData.rawText}
        />
      </div>

      {/* Action Area */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
        >
          {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          {copied ? "Copied" : "Copy Text"}
        </button>

        {isUrl(qrData.rawText) ? (
          <button 
            onClick={handleOpenLink}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-900/20"
          >
            <ExternalLink size={18} />
            Open Link
          </button>
        ) : (
           <button 
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <RefreshCw size={18} />
            Scan New
          </button>
        )}
      </div>
      
      {isUrl(qrData.rawText) && (
        <button 
          onClick={onReset}
          className="w-full mt-3 py-2 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
        >
          Scan Another Image
        </button>
      )}

    </div>
  );
};

export default ResultView;