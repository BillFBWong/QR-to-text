export enum AnalysisStatus {
  IDLE = 'IDLE',
  DECODING = 'DECODING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface QRData {
  rawText: string;
  imageSrc: string;
}

export interface AppState {
  status: AnalysisStatus;
  qrData: QRData | null;
  error: string | null;
}