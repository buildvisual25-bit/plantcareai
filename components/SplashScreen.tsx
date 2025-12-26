import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 overflow-hidden">
      <style>{`
        @keyframes hdScaleIn {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(1.02);
          }
          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }

        .animate-hd {
          animation: hdScaleIn 3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        
        .bg-glow {
            background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.02) 50%, transparent 80%);
        }
      `}</style>

      {/* High Quality Background */}
      <div className="absolute inset-0 bg-gray-950" />
      <div className="absolute inset-0 bg-glow" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center animate-hd">
        {/* Logo Box */}
        <div className="mb-8 p-1 rounded-3xl bg-gradient-to-br from-emerald-400/10 to-emerald-900/10 border border-emerald-500/20 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)]">
            <div className="w-32 h-32 bg-gray-900/90 rounded-2xl flex items-center justify-center shadow-inner border border-white/5">
                <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">🌿</span>
            </div>
        </div>

        {/* Text */}
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-100 to-gray-400">
          AI Plant Care
        </h1>
        
        <p className="text-emerald-400/90 text-sm font-medium tracking-[0.25em] uppercase mb-12 drop-shadow-md">
          Identify • Diagnose • Care
        </p>
        
        {/* Clean Loader */}
        <div className="flex gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;