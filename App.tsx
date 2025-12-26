
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import { PlantList } from './components/PlantList';
import PlantIdentifier from './components/PlantIdentifier';
import ChatBot from './components/ChatBot';
import Tools from './components/Tools';
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';
import { AppTab, UserProfile } from './types';
import { getPlants } from './services/storageService';
import { getUser } from './services/authService';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GARDEN);
  
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // App Preferences
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Enforce dark mode permanently
    document.documentElement.classList.add('dark');
    
    // Check for logged in user
    const existingUser = getUser();
    if (existingUser) {
        setUser(existingUser);
    }

    // Request Notification Permission
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Check for due reminders (Async)
    const checkReminders = async () => {
        try {
            const plants = await getPlants();
            let dueCount = 0;
            plants.forEach(plant => {
                if (plant.reminders) {
                    plant.reminders.forEach(reminder => {
                        if (Date.now() > reminder.nextDue) {
                            dueCount++;
                        }
                    });
                }
            });

            if (dueCount > 0 && Notification.permission === "granted") {
                new Notification("AI Plant Care", {
                    body: `You have ${dueCount} plant care tasks due today! 🌿`,
                    icon: "/icon.png"
                });
            }
        } catch (e) {
            console.error("Failed to check reminders", e);
        }
    };
    checkReminders();

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (newUser: UserProfile) => {
      setUser(newUser);
      setActiveTab(AppTab.GARDEN);
  };

  const handleLogout = () => {
      setUser(null);
      setIsGuest(false);
  };

  if (loading) {
    return <SplashScreen />;
  }

  // Show Login Screen if not logged in and not guest
  if (!user && !isGuest) {
      return <LoginScreen onLogin={handleLogin} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      {activeTab === AppTab.GARDEN && <PlantList onIdentify={setActiveTab} />}
      {activeTab === AppTab.IDENTIFY && <PlantIdentifier onComplete={setActiveTab} />}
      {activeTab === AppTab.TOOLS && <Tools />}
      {activeTab === AppTab.CHAT && <ChatBot autoSpeak={autoSpeak} />}
      {activeTab === AppTab.SETTINGS && (
          <Settings 
            autoSpeak={autoSpeak} 
            setAutoSpeak={setAutoSpeak} 
            user={user}
            onLogout={handleLogout}
          />
      )}
    </Layout>
  );
};

export default App;
