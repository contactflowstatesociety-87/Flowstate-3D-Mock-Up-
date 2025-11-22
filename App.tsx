
import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
  const [view, setView] = useState<'home' | 'editor' | 'login' | 'register'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState<boolean>(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
        setIsCheckingAuth(true);
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
        } catch (e) {
            console.error("Auth check failed", e);
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
  
  const handleNavigation = (targetView: 'home' | 'editor' | 'login' | 'register') => {
    if (targetView === 'editor' && !currentUser) {
      setView('login');
      return;
    }
    setView(targetView);
  }

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setView('editor');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setView('home');
  };

  const renderContent = () => {
    if (isCheckingAuth) {
        return <Loader message="Restoring session..." />;
    }

    switch (view) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={() => setView('register')} />;
      case 'register':
        return <RegisterPage onRegisterSuccess={handleLoginSuccess} onNavigate={() => setView('login')} />;
      case 'editor':
        if (!currentUser) {
            // Fix: don't return null here to avoid flickering, just redirect or show login
            setView('login');
            return null;
        }
        return <EditorPage 
            user={currentUser} 
            onLogout={handleLogout} 
            resetApiKeyStatus={() => setIsApiKeySelected(false)} 
        />;
      case 'home':
      default:
        // If user is already logged in, the "Get Started" button on Home should go straight to editor
        return <HomePage 
            onGetStarted={() => handleNavigation('editor')} 
            onNavigate={handleNavigation} 
            user={currentUser} 
        />;
    }
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
