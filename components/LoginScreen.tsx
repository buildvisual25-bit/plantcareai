
import React, { useState, useEffect } from 'react';
import { signInWithGoogle, initAuth } from '../services/authService';
import { UserProfile } from '../types';

interface LoginScreenProps {
    onLogin: (user: UserProfile) => void;
    onGuest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGuest }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        initAuth().catch(err => console.error("Auth init failed", err));
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await signInWithGoogle();
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            setError("Sign in failed. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-gray-950 flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-fade-in">
                
                {/* Logo */}
                <div className="mb-10 relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                    <div className="relative w-28 h-28 bg-gray-900 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center">
                        <span className="text-6xl drop-shadow-md">🌿</span>
                    </div>
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-400 text-sm">Sign in to sync your garden data and access AI features.</p>
                </div>

                {/* Login Button */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20 mb-4 group"
                >
                    {isLoading ? (
                         <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>Sign in with Google</span>
                        </>
                    )}
                </button>

                {error && (
                    <p className="text-red-400 text-xs mb-4 animate-shake">{error}</p>
                )}

                {/* Guest Option */}
                <button 
                    onClick={onGuest}
                    className="text-gray-500 text-sm font-medium hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
                >
                    Continue as Guest
                </button>
                
                <div className="mt-12 text-center">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Powered by Gemini AI</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
