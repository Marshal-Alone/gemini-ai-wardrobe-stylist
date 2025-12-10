export interface UploadedImage {
  id: string;
  url: string; // Base64 data URL
  file: File;
}

export interface ClothingItem {
  id: string;
  type: 'shirt' | 'pant' | 'accessory';
  images: UploadedImage[];
}

export interface UserStats {
  height: string;
  weight: string;
  skinTone: string;
  bodyType: string;
  is3DScan: boolean;
  occasion: string;
}

export interface TryOnResult {
  id: string;
  shirtId: string;
  pantId: string;
  generatedImageUrl: string | null;
  stylistFeedback: StylistFeedback | null;
  loading: boolean;
  error?: string;
}

export interface StylistFeedback {
  rating: number; // 1-10
  suitability: string;
  colorAnalysis: string;
  verdict: string;
  bestForEvent: string;
}