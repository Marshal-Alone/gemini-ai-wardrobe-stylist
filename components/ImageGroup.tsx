import React, { useRef } from 'react';
import { Upload, X, Plus, Images } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImageGroupProps {
  label: string;
  images: UploadedImage[];
  onAdd: (files: File[], urls: string[]) => void;
  onRemove: (id: string) => void;
  maxImages?: number;
  className?: string;
}

const ImageGroup: React.FC<ImageGroupProps> = ({ 
  label, 
  images, 
  onAdd, 
  onRemove,
  maxImages = 5,
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Explicitly type the array to prevent 'unknown' type inference issues
      const files: File[] = Array.from(e.target.files);
      const newFiles: File[] = [];
      const newUrls: string[] = [];
      
      let processedCount = 0;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newFiles.push(file);
            newUrls.push(event.target.result as string);
          }
          processedCount++;
          if (processedCount === files.length) {
            onAdd(newFiles, newUrls);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const remainingSlots = maxImages - images.length;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            {label}
            {images.length > 0 && <span className="bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded-full">{images.length} imgs</span>}
        </span>
      </div>
      
      {/* Container Area */}
      {images.length === 0 ? (
        // Empty State - Big Upload Button
        <div 
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-500 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent pointer-events-none" />
          <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors mb-3 relative z-10">
            <Images size={24} className="text-zinc-400 group-hover:text-zinc-200" />
          </div>
          <p className="text-xs text-zinc-500 text-center px-4 relative z-10">
            Upload images<br/>
            <span className="text-[10px] opacity-70">(Front, Back, Detail)</span>
          </p>
        </div>
      ) : (
        // Grid State - Show Images + Add Button
        <div className="grid grid-cols-2 gap-2 w-full aspect-[3/4] bg-zinc-900/30 p-2 rounded-xl border border-zinc-800 overflow-y-auto">
           {images.map((img) => (
             <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square border border-zinc-700 bg-black">
                <img src={img.url} alt="Reference" className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                  className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={12} />
                </button>
             </div>
           ))}
           
           {/* Mini Add Button inside Grid */}
           {remainingSlots > 0 && (
             <div 
               onClick={() => inputRef.current?.click()}
               className="flex flex-col items-center justify-center aspect-square rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 cursor-pointer transition-colors"
             >
                <Plus size={20} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-500 mt-1">Add</span>
             </div>
           )}
        </div>
      )}
      
      <input 
        type="file" 
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden" 
      />
    </div>
  );
};

export default ImageGroup;