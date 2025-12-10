import React, { useState } from 'react';
import { UploadedImage, TryOnResult, UserStats, ClothingItem, SavedScan } from './types';
import ImageGroup from './components/ImageGroup';
import StatInput from './components/StatInput';
import ResultCard from './components/ResultCard';
import CameraScanner from './components/CameraScanner';
import AvatarViewer from './components/AvatarViewer';
import SavedScansManager from './components/SavedScansManager';
import { generateTryOnImage, generateStylistFeedback, detectUserStats } from './services/geminiService';
import { Wand2, Shirt, User, Scissors, Plus, X, Glasses, Box, Camera, Upload, Sparkles, Calendar } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [bodyImages, setBodyImages] = useState<UploadedImage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzingStats, setIsAnalyzingStats] = useState(false);

  // Collections
  const [shirts, setShirts] = useState<ClothingItem[]>([]);
  const [pants, setPants] = useState<ClothingItem[]>([]);
  const [accessories, setAccessories] = useState<ClothingItem[]>([]);

  const [stats, setStats] = useState<UserStats>({
    height: '',
    weight: '',
    skinTone: '',
    bodyType: 'Average',
    is3DScan: false,
    occasion: '',
    stylePreferences: '',
    additionalNotes: ''
  });

  const [results, setResults] = useState<TryOnResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Handlers for Body Images ---
  const handleBodyAdd = (files: File[], urls: string[]) => {
    const newImages = files.map((file, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      url: urls[i],
      file
    }));
    setBodyImages(prev => [...prev, ...newImages]);
    // If uploading manually, ensure 3D scan mode is off unless specifically toggled later
    if (stats.is3DScan) setStats(prev => ({ ...prev, is3DScan: false }));
  };

  const handleBodyRemove = (id: string) => {
    setBodyImages(prev => prev.filter(img => img.id !== id));
    if (bodyImages.length <= 1) {
      setStats(prev => ({ ...prev, is3DScan: false }));
    }
  };

  const handleScanComplete = (images: UploadedImage[]) => {
    setBodyImages(images);
    setIsScanning(false);
    // Automatically enable 3D scan mode for the stylist prompt
    setStats(prev => ({ ...prev, is3DScan: true }));
  };

  const handleLoadSavedScan = (scan: SavedScan) => {
    setBodyImages(scan.images);
    setStats(prev => ({ ...prev, is3DScan: true }));
    console.log('✅ Loaded saved scan:', scan.id);
  };

  const handleAutoDetectStats = async () => {
    if (bodyImages.length === 0) {
      alert("Please upload or scan a body image first.");
      return;
    }

    setIsAnalyzingStats(true);
    try {
      // Use the first image for analysis
      const analysis = await detectUserStats(bodyImages[0].url);
      setStats(prev => ({
        ...prev,
        height: analysis.height || prev.height,
        weight: analysis.weight || prev.weight,
        skinTone: analysis.skinTone || prev.skinTone,
        bodyType: analysis.bodyType || prev.bodyType,
        additionalNotes: analysis.additionalNotes || prev.additionalNotes,
      }));
    } catch (error) {
      console.error("Failed to detect stats", error);
      alert("Could not auto-detect stats. Please try a clearer image.");
    } finally {
      setIsAnalyzingStats(false);
    }
  };

  // --- Handlers for Clothing Items ---
  const addClothingItem = (type: 'shirt' | 'pant' | 'accessory') => {
    const newItem: ClothingItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      images: []
    };
    if (type === 'shirt') setShirts(prev => [...prev, newItem]);
    else if (type === 'pant') setPants(prev => [...prev, newItem]);
    else setAccessories(prev => [...prev, newItem]);
  };

  const removeClothingItem = (id: string, type: 'shirt' | 'pant' | 'accessory') => {
    if (type === 'shirt') setShirts(prev => prev.filter(item => item.id !== id));
    else if (type === 'pant') setPants(prev => prev.filter(item => item.id !== id));
    else setAccessories(prev => prev.filter(item => item.id !== id));
  };

  const handleItemImageAdd = (itemId: string, type: 'shirt' | 'pant' | 'accessory', files: File[], urls: string[]) => {
    const newImages = files.map((file, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      url: urls[i],
      file
    }));

    const updateList = (list: ClothingItem[]) =>
      list.map(item => item.id === itemId ? { ...item, images: [...item.images, ...newImages] } : item);

    if (type === 'shirt') setShirts(prev => updateList(prev));
    else if (type === 'pant') setPants(prev => updateList(prev));
    else setAccessories(prev => updateList(prev));
  };

  const handleItemImageRemove = (itemId: string, imageId: string, type: 'shirt' | 'pant' | 'accessory') => {
    const updateList = (list: ClothingItem[]) =>
      list.map(item => item.id === itemId ? { ...item, images: item.images.filter(img => img.id !== imageId) } : item);

    if (type === 'shirt') setShirts(prev => updateList(prev));
    else if (type === 'pant') setPants(prev => updateList(prev));
    else setAccessories(prev => updateList(prev));
  };

  // --- Generation Logic ---
  const handleGenerate = async () => {
    if (bodyImages.length === 0 || shirts.length === 0 || pants.length === 0) {
      alert("Please upload at least one body photo, one shirt item, and one pant item.");
      return;
    }

    // Filter out items that have no images
    const validShirts = shirts.filter(s => s.images.length > 0);
    const validPants = pants.filter(p => p.images.length > 0);
    const validAccessories = accessories.filter(a => a.images.length > 0);

    if (validShirts.length === 0 || validPants.length === 0) {
      alert("Please ensure all selected clothing items have at least one image uploaded.");
      return;
    }

    setIsGenerating(true);
    setResults([]);

    // Create combinations
    const combinations: { shirt: ClothingItem, pant: ClothingItem }[] = [];
    validShirts.forEach(shirt => {
      validPants.forEach(pant => {
        combinations.push({ shirt, pant });
      });
    });

    // Initialize result placeholders
    const initialResults: TryOnResult[] = combinations.map(combo => ({
      id: `${combo.shirt.id}-${combo.pant.id}`,
      shirtId: combo.shirt.id,
      pantId: combo.pant.id,
      generatedImageUrl: null,
      stylistFeedback: null,
      loading: true
    }));
    setResults(initialResults);

    // Collect all accessory images to use in every look
    const accessoryUrls = validAccessories.flatMap(a => a.images.map(i => i.url));

    // Process each combination
    for (const combo of combinations) {
      const resultId = `${combo.shirt.id}-${combo.pant.id}`;

      try {
        const bodyUrls = bodyImages.map(img => img.url);
        const shirtUrls = combo.shirt.images.map(img => img.url);
        const pantUrls = combo.pant.images.map(img => img.url);

        // 1. Generate Image (Now includes accessories and 3D mode flag)
        const generatedImg = await generateTryOnImage(bodyUrls, shirtUrls, pantUrls, accessoryUrls, stats.is3DScan);

        setResults(prev => prev.map(r => r.id === resultId ? { ...r, generatedImageUrl: generatedImg } : r));

        // 2. Get Stylist Feedback
        const feedback = await generateStylistFeedback(generatedImg, stats);

        setResults(prev => prev.map(r => r.id === resultId ? { ...r, stylistFeedback: feedback, loading: false } : r));

      } catch (error) {
        console.error(`Error processing combination ${resultId}:`, error);

        // Extract error message
        let errorMessage = "Failed to generate look.";
        if (error instanceof Error) {
          errorMessage = error.message;
          // Handle complex JSON error messages from API
          if (errorMessage.includes("ApiError")) {
            try {
              // Attempt to extract friendly message if it's stringified JSON
              if (errorMessage.includes("429")) {
                errorMessage = "Daily Quota Exceeded. The free tier limit has been reached. Please try again later or use an upgraded key.";
              } else if (errorMessage.includes("400")) {
                errorMessage = "Invalid request. Please check your image inputs.";
              }
            } catch (e) {
              // Fallback to basic message
            }
          }
        }

        setResults(prev => prev.map(r => r.id === resultId ? { ...r, loading: false, error: errorMessage } : r));
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">

      {/* Scanner Overlay */}
      {isScanning && (
        <CameraScanner
          onComplete={handleScanComplete}
          onCancel={() => setIsScanning(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <Wand2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Gemini<span className="text-zinc-500">Wardrobe</span></h1>
              <p className="text-xs text-zinc-500">AI-Powered Virtual Stylist</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini 2.5 Active
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-16">

        {/* Input Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Left Column: User Profile & Body */}
          <div className="lg:col-span-4 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="text-indigo-400" />
                Your Profile
              </h2>
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 backdrop-blur-sm">
                <div className="space-y-6">

                  {/* Avatar/Image Selection Logic */}
                  {bodyImages.length > 0 && stats.is3DScan ? (
                    <AvatarViewer
                      images={bodyImages}
                      onRetake={() => {
                        setBodyImages([]);
                        setStats(s => ({ ...s, is3DScan: false }));
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Body Reference</span>

                      {bodyImages.length > 0 ? (
                        <ImageGroup
                          label="Uploaded Photos"
                          images={bodyImages}
                          onAdd={handleBodyAdd}
                          onRemove={handleBodyRemove}
                          maxImages={5}
                        />
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => setIsScanning(true)}
                            className="flex flex-col items-center justify-center w-full p-8 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all group hover:border-indigo-500/50"
                          >
                            <div className="bg-zinc-800 group-hover:bg-indigo-500/20 p-4 rounded-full mb-3 transition-colors">
                              <Camera size={32} className="text-zinc-200 group-hover:text-indigo-400" />
                            </div>
                            <span className="font-bold text-lg text-white">Start 3D Body Scan</span>
                            <span className="text-xs text-zinc-500 mt-1">Use camera to create 360° avatar</span>
                          </button>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-zinc-900 px-2 text-zinc-500">Or upload photos</span>
                            </div>
                          </div>

                          <button
                            onClick={() => document.getElementById('manual-upload-trigger')?.click()}
                            className="flex items-center justify-center gap-2 w-full p-4 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl transition-all text-sm text-zinc-400 hover:text-white"
                          >
                            <Upload size={16} />
                            Upload Manually
                          </button>

                          {/* Hidden ImageGroup for logic reuse */}
                          <div className="hidden">
                            <ImageGroup
                              label=""
                              images={[]}
                              onAdd={handleBodyAdd}
                              onRemove={() => { }}
                            />
                          </div>
                          <ImageGroup
                            label="Manual Upload"
                            images={bodyImages}
                            onAdd={handleBodyAdd}
                            onRemove={handleBodyRemove}
                            className={bodyImages.length > 0 ? "" : "hidden"}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {bodyImages.length === 0 && (
                    <div className="pt-2">
                      <ImageGroup
                        label="Or Manual Upload"
                        images={bodyImages}
                        onAdd={handleBodyAdd}
                        onRemove={handleBodyRemove}
                      />
                    </div>
                  )}

                  {/* Saved Scans Manager */}
                  {bodyImages.length === 0 && (
                    <div className="pt-6 border-t border-zinc-800">
                      <SavedScansManager onLoadScan={handleLoadSavedScan} />
                    </div>
                  )}

                  {/* Stats Section with Auto-Detect */}
                  <div className="space-y-3 mt-6 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Physical Stats</span>
                      <button
                        onClick={handleAutoDetectStats}
                        disabled={isAnalyzingStats || bodyImages.length === 0}
                        className={`
                                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all
                                ${isAnalyzingStats
                            ? 'bg-indigo-500/20 text-indigo-300 cursor-wait'
                            : bodyImages.length > 0
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:shadow-indigo-500/25'
                              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}
                              `}
                      >
                        <Sparkles size={12} className={isAnalyzingStats ? "animate-spin" : ""} />
                        {isAnalyzingStats ? "Analyzing..." : "Auto-Detect AI"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <StatInput label="Height" placeholder="e.g. 5'10" value={stats.height} onChange={(v) => setStats({ ...stats, height: v })} />
                      <StatInput label="Weight" placeholder="e.g. 160lbs" value={stats.weight} onChange={(v) => setStats({ ...stats, weight: v })} />
                      <StatInput label="Skin Tone" placeholder="e.g. Olive" value={stats.skinTone} onChange={(v) => setStats({ ...stats, skinTone: v })} />
                      <StatInput label="Body Type" placeholder="e.g. Athletic" value={stats.bodyType} onChange={(v) => setStats({ ...stats, bodyType: v })} />
                    </div>
                  </div>

                  {/* Occasion & Style Selection */}
                  <div className="space-y-3 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Occasion
                      </label>
                      <input
                        type="text"
                        value={stats.occasion}
                        onChange={(e) => setStats({ ...stats, occasion: e.target.value })}
                        placeholder="e.g. Wedding Guest"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm placeholder:text-zinc-700"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} /> Style Preference
                      </label>
                      <input
                        type="text"
                        value={stats.stylePreferences || ''}
                        onChange={(e) => setStats({ ...stats, stylePreferences: e.target.value })}
                        placeholder="e.g. Minimalist, Boho"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm placeholder:text-zinc-700"
                      />
                    </div>
                  </div>

                  {/* Additional Notes (Auto-filled) */}
                  {stats.additionalNotes && (
                    <div className="mt-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">AI Body Analysis Notes</p>
                      <p className="text-sm text-zinc-400 italic">{stats.additionalNotes}</p>
                    </div>
                  )}

                  {/* 3D Scan Toggle - Only show if NOT already in scan mode (manual upload override) */}
                  {!stats.is3DScan && (
                    <div className="flex items-center justify-between bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50 mt-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors bg-zinc-700 text-zinc-400`}>
                          <Box size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">Force 3D Analysis</p>
                          <p className="text-[10px] text-zinc-500">For manual uploads</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setStats({ ...stats, is3DScan: !stats.is3DScan })}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative bg-zinc-700`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 translate-x-0`} />
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Wardrobe & Action */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Scissors className="text-indigo-400" />
                The Collection
              </h2>

              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 backdrop-blur-sm space-y-8">

                {/* Shirts Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-300 flex items-center gap-2"><Shirt size={16} /> Tops</h3>
                    <button
                      onClick={() => addClothingItem('shirt')}
                      className="text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Top
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-4">
                    {shirts.map((shirt, index) => (
                      <div key={shirt.id} className="relative group">
                        <ImageGroup
                          label={`Top #${index + 1}`}
                          images={shirt.images}
                          onAdd={(f, u) => handleItemImageAdd(shirt.id, 'shirt', f, u)}
                          onRemove={(imgId) => handleItemImageRemove(shirt.id, imgId, 'shirt')}
                          className="w-full"
                          maxImages={4}
                        />
                        <button
                          onClick={() => removeClothingItem(shirt.id, 'shirt')}
                          className="absolute -top-2 -right-2 z-10 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-red-400 transition-colors shadow-lg"
                          title="Delete Item"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {shirts.length === 0 && (
                      <div className="col-span-full text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
                        Click "Add Top" to start your collection.
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-zinc-800 w-full" />

                {/* Pants Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-300 flex items-center gap-2"><Scissors size={16} className="rotate-90" /> Bottoms</h3>
                    <button
                      onClick={() => addClothingItem('pant')}
                      className="text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Bottom
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-4">
                    {pants.map((pant, index) => (
                      <div key={pant.id} className="relative group">
                        <ImageGroup
                          label={`Bottom #${index + 1}`}
                          images={pant.images}
                          onAdd={(f, u) => handleItemImageAdd(pant.id, 'pant', f, u)}
                          onRemove={(imgId) => handleItemImageRemove(pant.id, imgId, 'pant')}
                          className="w-full"
                          maxImages={4}
                        />
                        <button
                          onClick={() => removeClothingItem(pant.id, 'pant')}
                          className="absolute -top-2 -right-2 z-10 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-red-400 transition-colors shadow-lg"
                          title="Delete Item"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {pants.length === 0 && (
                      <div className="col-span-full text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
                        Click "Add Bottom" to start your collection.
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-zinc-800 w-full" />

                {/* Accessories Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-300 flex items-center gap-2"><Glasses size={16} /> Accessories (Optional)</h3>
                    <button
                      onClick={() => addClothingItem('accessory')}
                      className="text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-4">
                    {accessories.map((acc, index) => (
                      <div key={acc.id} className="relative group">
                        <ImageGroup
                          label={`Item #${index + 1}`}
                          images={acc.images}
                          onAdd={(f, u) => handleItemImageAdd(acc.id, 'accessory', f, u)}
                          onRemove={(imgId) => handleItemImageRemove(acc.id, imgId, 'accessory')}
                          className="w-full"
                          maxImages={4}
                        />
                        <button
                          onClick={() => removeClothingItem(acc.id, 'accessory')}
                          className="absolute -top-2 -right-2 z-10 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-red-400 transition-colors shadow-lg"
                          title="Delete Item"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {accessories.length === 0 && (
                      <div className="col-span-full text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
                        Click "Add Item" to include goggles, headphones, etc.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Action Area */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || bodyImages.length === 0 || shirts.length === 0 || pants.length === 0}
                className={`
                        relative overflow-hidden group px-8 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300
                        ${isGenerating || bodyImages.length === 0 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105 hover:shadow-indigo-500/30'}
                    `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isGenerating ? 'Curating Looks...' : 'Generate Try-Ons'}
                  {!isGenerating && <Wand2 size={20} />}
                </span>
                {!isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />}
              </button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-10 duration-700">
            <h2 className="text-3xl font-bold mb-8 text-center">Your Stylist Curations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {results.map(result => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          </section>
        )}

      </main>

      <footer className="border-t border-zinc-900 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-600 text-sm">
          <p>Powered by Google Gemini 2.5 "Banana" & Pro Models.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;