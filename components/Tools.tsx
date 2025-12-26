import React, { useState, useEffect, useRef } from 'react';
import { getWeather } from '../services/weatherService';
import { analyzeLight } from '../services/geminiService';
import { downscaleImageToBlob } from '../services/imageUtils';
import { WeatherData } from '../types';

const Tools: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>("Loading location...");
  const [loadingWeather, setLoadingWeather] = useState(true);
  
  // Light Meter State
  const [lightResult, setLightResult] = useState<string | null>(null);
  const [analyzingLight, setAnalyzingLight] = useState(false);
  const lightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          const data = await getWeather(latitude, longitude);
          setWeather(data);
          setLoadingWeather(false);
        },
        (error) => {
          console.error(error);
          setLocationName("Location denied");
          setLoadingWeather(false);
        }
      );
    } else {
      setLocationName("Not supported");
      setLoadingWeather(false);
    }
  }, []);

  const handleLightCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        setAnalyzingLight(true);
        setLightResult(null);
        
        // Compress image using Blob workflow
        const blob = await downscaleImageToBlob(file, 1024, 0.7);
        
        // Pass blob directly to service
        const analysis = await analyzeLight(blob);
        setLightResult(analysis);
    } catch (error) {
        console.error("Light analysis error", error);
        setLightResult("Error processing image.");
    } finally {
        setAnalyzingLight(false);
    }
  };

  const getWeatherIcon = (code: number) => {
      if (code === 0) return "☀️";
      if (code < 3) return "⛅";
      if (code < 50) return "🌫️";
      if (code < 80) return "🌧️";
      return "⛈️";
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Weather Widget */}
      <div className="bg-gradient-to-br from-blue-400 to-emerald-500 rounded-2xl p-6 text-white shadow-lg transition-all hover:shadow-xl">
        <h2 className="text-sm font-semibold opacity-90 uppercase tracking-wider mb-4 border-b border-white/20 pb-2">Local Weather</h2>
        {loadingWeather ? (
            <div className="animate-pulse space-y-4">
                <div className="h-16 w-3/4 bg-white/20 rounded"></div>
                <div className="h-8 w-1/2 bg-white/20 rounded"></div>
            </div>
        ) : weather ? (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-6xl font-bold mb-1 tracking-tight">{Math.round(weather.temperature)}°</div>
                        <div className="text-sm font-medium opacity-90 flex items-center gap-1">
                          📍 {locationName}
                        </div>
                    </div>
                    <div className="text-7xl drop-shadow-sm">{getWeatherIcon(weather.weatherCode)}</div>
                </div>
                
                {/* Weather Details Grid */}
                <div className="grid grid-cols-2 gap-3 mt-2 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-3 p-2">
                        <span className="text-2xl">💧</span>
                        <div className="flex flex-col">
                             <span className="text-xs opacity-70 uppercase font-bold tracking-wider">Humidity</span>
                             <span className="font-semibold text-lg">{weather.humidity}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 border-l border-white/10 pl-4">
                        <span className="text-2xl">💨</span>
                        <div className="flex flex-col">
                             <span className="text-xs opacity-70 uppercase font-bold tracking-wider">Wind</span>
                             <span className="font-semibold text-lg">{weather.windSpeed} <span className="text-sm font-normal">km/h</span></span>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center py-4 bg-white/10 rounded-lg">
                <p>Could not load weather data.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-2 text-xs underline opacity-80"
                >
                    Retry
                </button>
            </div>
        )}
      </div>

      {/* Light Meter Tool */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">💡</span>
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Light Guide</h2>
                <p className="text-xs text-gray-500">AI-powered analysis</p>
            </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Not sure if a spot is "bright indirect" or "low light"? Take a photo of the location, and I'll analyze it for you.
        </p>

        <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={lightInputRef} 
            onChange={handleLightCapture} 
            className="hidden" 
        />
        
        <button 
            onClick={() => lightInputRef.current?.click()}
            disabled={analyzingLight}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 rounded-xl transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2"
        >
            {analyzingLight ? (
                <>
                 <span className="animate-spin">⏳</span> Analyzing...
                </>
            ) : (
                <>📸 Check Light Level</>
            )}
        </button>

        {lightResult && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800/30 animate-fade-in">
                <p className="font-bold text-yellow-800 dark:text-yellow-400 mb-1">Result:</p>
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{lightResult}</p>
            </div>
        )}
      </div>

       {/* Location Info (Passive) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 opacity-70">
         <h3 className="font-bold text-gray-500 mb-2 text-xs uppercase">Your Zone</h3>
         <p className="text-sm">Based on your GPS, ensure plants can survive local frost dates and heat waves. (Zone data approximation based on temperature).</p>
      </div>

    </div>
  );
};

export default Tools;