import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { UploadedImage } from '../types';

interface FileUploadProps {
  label: string;
  type: 'body' | 'shirt' | 'pant' | 'accessory';
  onUpload: (file: File, url: string) => void;
  onRemove?: (id: string) => void;
  currentImage?: UploadedImage | null;
  className?: string;
  accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  onUpload, 
  currentImage, 
  onRemove,
  className = "",
  accept = "image/*"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(file, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again if needed
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
      
      {currentImage ? (
        <div className="relative group overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 aspect-[3/4]">
          <img 
            src={currentImage.url} 
            alt={label} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          {onRemove && (
            <button 
              onClick={() => onRemove(currentImage.id)}
              className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div 
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-500 transition-all cursor-pointer group"
        >
          <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors mb-3">
            <Upload size={24} className="text-zinc-400 group-hover:text-zinc-200" />
          </div>
          <p className="text-xs text-zinc-500 text-center px-4">Click to upload</p>
        </div>
      )}
      
      <input 
        type="file" 
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden" 
      />
    </div>
  );
};

export default FileUpload;