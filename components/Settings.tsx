
import React, { useState, useEffect } from 'react';
import { getPlants } from '../services/storageService';
import { initGoogleDrive, backupToDrive } from '../services/googleDriveService';
import { signOut } from '../services/authService';
import { UserProfile } from '../types';
import { GOOGLE_CLIENT_ID } from '../config';

interface SettingsProps {
    autoSpeak: boolean;
    setAutoSpeak: (val: boolean) => void;
    user: UserProfile | null;
    onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ autoSpeak, setAutoSpeak, user, onLogout }) => {
  const [plantCount, setPlantCount] = useState<number>(0);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  
  // App Preferences
  const [useCloudBackup, setUseCloudBackup] = useState(false);

  // API Key State (Google Drive only now)
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  
  const [showGoogleKeys, setShowGoogleKeys] = useState(false);

  // Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  // Accordion State: all closed by default
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    // Check for iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Load cloud backup setting
    const storedUseBackup = localStorage.getItem('USE_CLOUD_BACKUP') === 'true';
    setUseCloudBackup(storedUseBackup);

    // Only init drive if enabled
    if (storedUseBackup) {
        initGoogleDrive();
    }

    getPlants().then(plants => setPlantCount(plants.length));
    
    // Check local storage for overrides, otherwise use default constants
    const savedClientId = localStorage.getItem('GOOGLE_CLIENT_ID');
    const savedApiKey = localStorage.getItem('GOOGLE_API_KEY');
    
    setGoogleClientId(savedClientId || GOOGLE_CLIENT_ID);
    setGoogleApiKey(savedApiKey || '');

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
              setInstallPrompt(null);
          }
      });
  };

  const toggleCloudBackup = () => {
    const newVal = !useCloudBackup;
    setUseCloudBackup(newVal);
    localStorage.setItem('USE_CLOUD_BACKUP', String(newVal));
    
    if (newVal) {
        initGoogleDrive();
    }
  };

  const handleBackup = async () => {
      if (!useCloudBackup) return;

      setBackupStatus('uploading');
      try {
          const plants = await getPlants();
          await backupToDrive(plants, `ai_plant_care_backup_${Date.now()}.json`);
          setBackupStatus('done');
          setTimeout(() => setBackupStatus('idle'), 3000);
      } catch (e: any) {
          console.error(e);
          alert(typeof e === 'string' ? e : "Backup failed. Check console.");
          setBackupStatus('error');
          setTimeout(() => setBackupStatus('idle'), 3000);
      }
  };

  const handleSignOut = () => {
      if(window.confirm("Are you sure you want to sign out?")) {
          signOut();
          onLogout();
      }
  };

  const handleGoogleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setGoogleClientId(val);
      localStorage.setItem('GOOGLE_CLIENT_ID', val.trim());
  };

  const handleGoogleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setGoogleApiKey(val);
      localStorage.setItem('GOOGLE_API_KEY', val.trim());
  };

  const toggleSection = (section: string) => {
      setOpenSection(openSection === section ? null : section);
  };
  
  return (
    <div className="p-6 space-y-6">
      
      {/* Profile Header */}
      <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-emerald-300 drop-shadow-md">Settings</h2>
          {user ? (
              <div className="flex items-center gap-3 bg-white/5 pl-2 pr-4 py-1.5 rounded-full border border-white/10">
                  <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-emerald-500/50" />
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200 leading-none">{user.name}</span>
                      <span className="text-[9px] text-gray-500 leading-none mt-0.5">Google Account</span>
                  </div>
              </div>
          ) : (
               <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">Guest Mode</span>
          )}
      </div>
      
      {/* Install App Card (Visible if installable or iOS) */}
      {(installPrompt || isIOS) && (
        <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-600/20 rounded-2xl border border-emerald-500/30 shadow-lg p-4 mb-4">
             <div className="flex items-center gap-4 mb-3">
                <span className="text-3xl">📲</span>
                <div>
                    <h3 className="font-bold text-gray-100">Install App</h3>
                    <p className="text-xs text-gray-400">Add to your home screen</p>
                </div>
            </div>
            
            {installPrompt && (
                <button 
                    onClick={handleInstallClick}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                    Install Now
                </button>
            )}

            {isIOS && (
                <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="mb-2">To install on iPhone/iPad:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-xs text-gray-400">
                        <li>Tap the <span className="font-bold text-blue-400">Share</span> button in Safari.</li>
                        <li>Scroll down and select <span className="font-bold text-white">Add to Home Screen</span>.</li>
                    </ol>
                </div>
            )}
        </div>
      )}

      {/* Accordion Container */}
      <div className="space-y-4">

        {/* Preferences Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all hover:bg-white/10">
            <button 
                onClick={() => toggleSection('prefs')}
                className="w-full flex items-center justify-between p-4 focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <span className="text-xl p-2 bg-emerald-900/30 rounded-lg text-emerald-400 border border-emerald-500/20">⚙️</span>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-200">Preferences</h3>
                        <p className="text-xs text-gray-500">App Settings</p>
                    </div>
                </div>
                <span className={`text-gray-400 transform transition-transform duration-300 ${openSection === 'prefs' ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {openSection === 'prefs' && (
                <div className="p-5 border-t border-white/5 bg-black/20 animate-fade-in space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-gray-200 text-sm font-medium">Auto-Play Voice</span>
                        <button 
                            onClick={() => setAutoSpeak(!autoSpeak)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${autoSpeak ? 'bg-emerald-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${autoSpeak ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     <p className="text-xs text-gray-500">Automatically read Evan's responses aloud in the chat.</p>
                </div>
            )}
        </div>
        
        {/* Stats Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all hover:bg-white/10">
            <button 
                onClick={() => toggleSection('stats')}
                className="w-full flex items-center justify-between p-4 focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <span className="text-xl p-2 bg-emerald-900/30 rounded-lg text-emerald-400 border border-emerald-500/20">📊</span>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-200">Garden Stats</h3>
                        <p className="text-xs text-gray-500">Usage & Information</p>
                    </div>
                </div>
                <span className={`text-gray-400 transform transition-transform duration-300 ${openSection === 'stats' ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {openSection === 'stats' && (
                <div className="p-5 border-t border-white/5 bg-black/20 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Plants Saved</span>
                        <span className="text-3xl font-bold text-emerald-400">{plantCount}</span>
                    </div>
                </div>
            )}
        </div>

        {/* Data & Backup Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all hover:bg-white/10">
            <button 
                onClick={() => toggleSection('data')}
                className="w-full flex items-center justify-between p-4 focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <span className="text-xl p-2 bg-green-900/30 rounded-lg text-green-400 border border-green-500/20">💾</span>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-200">Data & Backup</h3>
                        <p className="text-xs text-gray-500">Cloud Sync</p>
                    </div>
                </div>
                <span className={`text-gray-400 transform transition-transform duration-300 ${openSection === 'data' ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {openSection === 'data' && (
                <div className="p-5 border-t border-white/5 bg-black/20 animate-fade-in flex flex-col gap-3">
                    
                    {/* Toggle Cloud Backup */}
                     <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 mb-2">
                        <div>
                             <span className="text-gray-200 text-sm font-bold block">Google Drive Backup</span>
                             <span className="text-[10px] text-gray-500">Enable optional cloud features</span>
                        </div>
                        <button 
                            onClick={toggleCloudBackup}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${useCloudBackup ? 'bg-green-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${useCloudBackup ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                     </div>

                    {useCloudBackup && (
                        <button 
                            onClick={handleBackup}
                            disabled={backupStatus === 'uploading'}
                            className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 p-4 rounded-xl transition-colors border border-white/5 shadow-md active:scale-[0.98] group"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl bg-gray-700 p-2 rounded-lg group-hover:bg-gray-600 transition-colors">☁️</span>
                                <div className="text-left">
                                    <div className="font-bold text-gray-100">Backup to Drive</div>
                                    <div className="text-xs text-gray-400">Cloud Save</div>
                                </div>
                            </div>
                            {backupStatus === 'uploading' && <span className="animate-spin text-xl">⏳</span>}
                            {backupStatus === 'done' && <span className="text-xl">✅</span>}
                            {backupStatus === 'error' && <span className="text-xl">❌</span>}
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* API Config Card - Only Google Drive now */}
        {useCloudBackup && (
        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all hover:bg-white/10">
            <button 
                onClick={() => toggleSection('api')}
                className="w-full flex items-center justify-between p-4 focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <span className="text-xl p-2 bg-blue-900/30 rounded-lg text-blue-400 border border-blue-500/20">🔌</span>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-200">Connected Services</h3>
                        <p className="text-xs text-gray-500">Third-party integrations used by AIPlantCare</p>
                    </div>
                </div>
                <span className={`text-gray-400 transform transition-transform duration-300 ${openSection === 'api' ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {openSection === 'api' && (
                <div className="p-5 border-t border-white/5 bg-black/20 animate-fade-in space-y-4">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-emerald-300 uppercase">Google Drive Credentials</label>
                            <button 
                                onClick={() => setShowGoogleKeys(!showGoogleKeys)}
                                className="text-xs text-gray-400 hover:text-white underline"
                            >
                                {showGoogleKeys ? 'Hide Keys' : 'Show Keys'}
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Google Client ID</label>
                                <input 
                                    type={showGoogleKeys ? "text" : "password"}
                                    value={googleClientId}
                                    onChange={handleGoogleClientIdChange}
                                    placeholder="e.g. 123...apps.googleusercontent.com"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Google API Key</label>
                                <input 
                                    type={showGoogleKeys ? "text" : "password"}
                                    value={googleApiKey}
                                    onChange={handleGoogleApiKeyChange}
                                    placeholder="Enter Drive API.."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                            Required for Backup. Paste your keys here.<br/>
                            <span className="text-red-400/80">Important: Do not enter your <strong>Client Secret</strong>. It is not required for this app.</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
        )}

      </div>

      {user && (
          <button 
            onClick={handleSignOut}
            className="w-full mt-8 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-900/10 text-sm font-medium transition-colors"
          >
              Sign Out
          </button>
      )}

      <div className="text-center text-xs text-gray-600 mt-6 pb-6">
        AI Plant Care v1.0.0
      </div>
    </div>
  );
};

export default Settings;
