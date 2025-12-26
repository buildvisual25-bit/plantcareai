import React, { useState, useRef, useEffect } from 'react';
import { identifyPlant, getPlantCare } from '../services/geminiService';
import { identifyWithPlantNet } from '../services/plantNetService';
import { savePlant } from '../services/storageService';
import { downscaleImageToBlob, blobToBase64 } from '../services/imageUtils';
import { PlantData, AppTab } from '../types';

interface Props {
    onComplete: (tab: AppTab) => void;
}

const PlantIdentifier: React.FC<Props> = ({ onComplete }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [result, setResult] = useState<Partial<PlantData> | null>(null);
  
  // Track identification source and errors
  const [source, setSource] = useState<'PlantNet' | 'Gemini Vision' | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setSource(null);
    setFallbackReason(null);
    setLoadingStep('Processing image...');

    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      // Reduced to 1024 to prevent Android Memory Crash
      const blob = await downscaleImageToBlob(file, 1024, 0.8);
      setProcessedBlob(blob);

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      await processImage(blob);

    } catch (error) {
      console.error("Image processing error", error);
      alert("Could not process image. Device memory might be low. Please try a smaller image.");
      setLoading(false);
    }
  };

  const processImage = async (blob: Blob) => {
    let plantNetResult = null;
    let plantNetError = null;

    // 1. Try PlantNet First
    try {
        setLoadingStep('Checking PlantNet database...');
        const pNetResult = await identifyWithPlantNet(blob);
        if (pNetResult) {
            plantNetResult = pNetResult;
        }
    } catch (e: any) {
        console.warn("PlantNet Check Failed:", e.message);
        plantNetError = e.message;
    }

    try {
        let careData;

        // 2. If PlantNet worked, try to get Care Instructions from Gemini
        if (plantNetResult && plantNetResult.score > 0.05) {
             setLoadingStep(`Found ${plantNetResult.bestMatch}. Getting Care Guide...`);
             setSource('PlantNet');
             
             try {
                careData = await getPlantCare(plantNetResult.bestMatch, blob);
             } catch (geminiError) {
                 console.warn("Gemini Care Guide Failed, using generic fallback.");
                 careData = {
                     name: plantNetResult.commonNames[0] || plantNetResult.bestMatch,
                     scientificName: plantNetResult.bestMatch,
                     care: {
                         lifespan: "Unknown",
                         water: "Researching...",
                         light: "Researching...",
                         soil: "Standard Potting Mix",
                         temperature: "Average",
                         fertilizer: "Balanced",
                         pruning: "As needed",
                         pests: "Monitor regularly",
                         toxicity: "Research required"
                     }
                 };
                 alert("Identified via PlantNet! However, care instructions could not be generated (Google API Key missing or invalid).");
             }
        } 
        // 3. If PlantNet failed or wasn't sure, try Gemini Vision
        else {
             setLoadingStep('Identifying with AI Vision...');
             setSource('Gemini Vision');
             
             if (plantNetError) {
                 setFallbackReason(`PlantNet Error: ${plantNetError.length > 30 ? plantNetError.substring(0,27)+'...' : plantNetError}`);
             } else {
                 setFallbackReason("PlantNet: No confident match");
             }

             careData = await identifyPlant(blob);
        }

        if (careData) {
            setResult(careData);
        } else {
            let msg = "Could not identify plant.\n";
            
            if (plantNetError) {
                if (plantNetError.includes('Origin not allowed')) {
                    msg += `\nPlantNet Error: You must add your Vercel URL to your PlantNet Account 'Allowed Origins'.\n`;
                } else {
                    msg += `\nPlantNet Error: ${plantNetError}\n`;
                }
            }
            msg += "\nPlease check your settings and connections.";
            alert(msg);
        }

    } catch (error: any) {
      console.error("Identification Error", error);
      
      let errorMessage = "Failed to identify plant.\n";
      
      if (plantNetError) {
          if (plantNetError.includes('Origin not allowed')) {
             errorMessage += `\nPlantNet Error: Origin rejected. Please add '${window.location.origin}' to Allowed Origins in your PlantNet Dashboard.`;
          } else {
             errorMessage += `\nPlantNet Error: ${plantNetError}`;
          }
      }

      if (error.message) {
          if (error.message.includes('403') || error.message.includes('permission_denied')) {
             errorMessage += "\n\nGoogle AI: Access Denied. \nPlease enable the 'Generative Language API' in Google Cloud Console or check your API Key.";
          } else if (error.message.includes('API Key missing')) {
             errorMessage += "\n\nGoogle AI: Key Missing.";
          } else {
             errorMessage += `\n\nGoogle AI Error: ${error.message}`;
          }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSave = async () => {
    if (result && processedBlob && result.name && result.care) {
      try {
        const base64Str = await blobToBase64(processedBlob);
        const imageUri = `data:image/jpeg;base64,${base64Str}`;

        const newPlant: PlantData = {
            id: Date.now().toString(),
            name: result.name,
            scientificName: result.scientificName || 'Unknown',
            care: result.care,
            imageUri: imageUri,
            dateAdded: Date.now(),
        };
        await savePlant(newPlant);
        onComplete(AppTab.GARDEN);
      } catch (e) {
        alert("Failed to save plant. Storage might be unavailable.");
      }
    }
  };

  const reset = () => {
      setPreviewUrl(null);
      setProcessedBlob(null);
      setResult(null);
      setSource(null);
      setFallbackReason(null);
  };

  return (
    <div className="p-6 flex flex-col items-center min-h-full">
      <h2 className="text-2xl font-bold mb-6 text-emerald-300 drop-shadow-md">New Diagnosis</h2>

      {!previewUrl ? (
        <div className="w-full max-w-sm flex flex-col gap-4 mt-10">
           <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-sm"
           >
            <span className="text-6xl mb-4 filter drop-shadow-lg">📷</span>
            <p className="font-semibold text-gray-300">Tap to Capture</p>
           </div>
           <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
           />
        </div>
      ) : (
        <div className="w-full max-w-md animate-fade-in pb-20">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-6 border border-white/10">
            <img src={previewUrl} alt="Captured" className="w-full h-64 object-cover" />
            <button 
                onClick={reset}
                className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full backdrop-blur-md"
            >
                ✕
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-400 font-medium animate-pulse text-center">{loadingStep}</p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6 space-y-4">
                <div className="border-b border-white/10 pb-4">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold text-emerald-300">{result.name}</h3>
                         {source && (
                            <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] px-2 py-1 rounded border ${source === 'PlantNet' ? 'bg-green-900/40 text-green-300 border-green-500/30' : 'bg-blue-900/40 text-blue-300 border-blue-500/30'}`}>
                                    Via {source}
                                </span>
                                {fallbackReason && source !== 'PlantNet' && (
                                    <span className="text-[9px] text-red-300 bg-red-900/20 px-1 rounded">{fallbackReason}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="italic text-gray-400">{result.scientificName}</p>
                    {result.care?.lifespan && (
                        <span className="inline-block mt-2 bg-emerald-900/60 text-emerald-300 text-xs px-2 py-1 rounded-full font-medium border border-emerald-500/30">
                            {result.care.lifespan}
                        </span>
                    )}
                </div>
                
                <div className="space-y-4 text-sm text-gray-200">
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/20">
                            <span className="block font-bold text-blue-300 mb-1">💧 Water</span>
                            {result.care?.water}
                        </div>
                        <div className="bg-yellow-900/30 p-3 rounded-lg border border-yellow-500/20">
                            <span className="block font-bold text-yellow-300 mb-1">☀️ Light</span>
                            {result.care?.light}
                        </div>
                        <div className="bg-green-900/30 p-3 rounded-lg border border-green-500/20">
                            <span className="block font-bold text-green-300 mb-1">🌡️ Temp</span>
                            {result.care?.temperature}
                        </div>
                         <div className="bg-amber-900/30 p-3 rounded-lg border border-amber-500/20">
                            <span className="block font-bold text-amber-500 mb-1">🟤 Soil</span>
                            {result.care?.soil}
                        </div>
                    </div>
                    
                    {result.care?.pruning && (
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <span className="block font-bold text-purple-300 mb-1">✂️ Pruning</span>
                            {result.care.pruning}
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/50 transition-transform active:scale-95 mt-4 flex items-center justify-center gap-2"
                >
                    <span>🌱</span> Add to My Garden
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlantIdentifier;