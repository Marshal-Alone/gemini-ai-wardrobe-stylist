import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, ArrowRight, X } from 'lucide-react';
import { UploadedImage } from '../types';

interface CameraScannerProps {
  onComplete: (images: UploadedImage[]) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'front', label: 'Front View', instruction: 'Face the camera directly.' },
  { id: 'right', label: 'Right Side', instruction: 'Turn 90 degrees to your left.' },
  { id: 'back', label: 'Back View', instruction: 'Turn around completely.' },
  { id: 'left', label: 'Left Side', instruction: 'Turn 90 degrees to your left again.' },
];

const CameraScanner: React.FC<CameraScannerProps> = ({ onComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [captures, setCaptures] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions.");
      onCancel();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCapture = () => {
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(timer);
        takePhoto();
        setCountdown(null);
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image if using front camera for natural feel, or keep raw
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        
        const newCaptures = [...captures, dataUrl];
        setCaptures(newCaptures);

        if (newCaptures.length === STEPS.length) {
          finishScanning(newCaptures);
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    }
  };

  const finishScanning = (finalCaptures: string[]) => {
    stopCamera();
    
    // Convert DataURLs to UploadedImage format
    const uploadedImages: UploadedImage[] = finalCaptures.map((url, index) => {
        // Create a dummy file object since we just have the data URL
        const blobBin = atob(url.split(',')[1]);
        const array = [];
        for(let i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(array)], {type: 'image/png'});
        const file = new File([blob], `scan_${index}.png`, { type: 'image/png' });

        return {
            id: `scan-${Date.now()}-${index}`,
            url: url,
            file: file
        };
    });

    onComplete(uploadedImages);
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <RefreshCw className="animate-spin-slow" size={20} />
            3D Body Scan
          </h2>
          <p className="text-zinc-400 text-sm">Step {currentStepIndex + 1} of {STEPS.length}: {currentStep.label}</p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform -scale-x-100" 
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Guides / Overlays */}
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 m-8 rounded-xl">
             {/* Crosshair */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[1px] bg-white/30" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[1px] bg-white/30" />
             </div>
        </div>
        
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
            <span className="text-9xl font-bold text-white animate-ping">{countdown}</span>
          </div>
        )}

        {/* Instruction Banner */}
        <div className="absolute bottom-24 left-0 right-0 text-center px-6">
            <div className="bg-black/60 backdrop-blur-md text-white py-2 px-4 rounded-full inline-block border border-white/10">
                {currentStep.instruction}
            </div>
        </div>

        {/* Capture Controls */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8">
            <button 
                onClick={handleCapture}
                disabled={countdown !== null}
                className="w-16 h-16 rounded-full bg-white border-4 border-zinc-300 flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
            >
                <div className="w-14 h-14 rounded-full border-2 border-black" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default CameraScanner;
