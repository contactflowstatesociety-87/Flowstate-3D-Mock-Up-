
import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import ApiKeyModal from './components/ApiKeyModal';
import Loader from './components/Loader';
import * as authService from './services/authService';
import type { User } from './types';

// Mock the aistudio object for development if it doesn't exist.
if (typeof (window as any).aistudio === 'undefined') {
  console.log("Mocking window.aistudio for development.");
  (window as any).aistudio = {
    hasSelectedApiKey: () => new Promise(resolve => resolve(true)),
    openSelectKey: () => new Promise<void>(resolve => resolve()),
    getHostUrl: () => Promise.resolve(''),
    getModelQuota: () => Promise.resolve({
      canCreate: true,
      canUse: true,
      metricName: 'mock-metric',
      maxQuota: 100,
      remainingQuota: 100,
    }),
  };
}


const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState<boolean>(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Auto-initialize session (Implicit Login)
  useEffect(() => {
    const initAuth = async () => {
        setIsCheckingAuth(true);
        try {
            const user = await authService.initializeSession();
            setCurrentUser(user);
        } catch (e) {
            console.error("Auth initialization failed", e);
        } finally {
            setIsCheckingAuth(false);
        }
    };
    initAuth();
  }, []);

  const checkApiKey = useCallback(async () => {
    setIsCheckingApiKey(true);
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setIsApiKeySelected(hasKey);
    } catch (error) {
      console.error("Error checking for API key:", error);
      setIsApiKeySelected(false);
    } finally {
      setIsCheckingApiKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setIsApiKeySelected(true);
    } catch (error) {
      console.error("Error opening API key selection:", error);
    }
  };
  
  const handleNavigation = (targetView: 'home' | 'editor') => {
    setView(targetView);
  }

  const renderContent = () => {
    if (isCheckingAuth) {
        return <Loader message="Loading your studio..." />;
    }

    if (view === 'editor' && currentUser) {
        return <EditorPage 
            user={currentUser} 
            onLogout={() => setView('home')} 
            resetApiKeyStatus={() => setIsApiKeySelected(false)} 
        />;
    }

    // Default to Home
    return <HomePage 
        onGetStarted={() => handleNavigation('editor')} 
        user={currentUser} 
    />;
  };

  return (
    <div className="bg-surface-DEFAULT min-h-screen font-sans">
      {renderContent()}
      {!isApiKeySelected && view === 'editor' && !isCheckingApiKey && !isCheckingAuth && (
        <ApiKeyModal onSelectKey={handleSelectKey} />
      )}
    </div>
  );
};

export default App;
