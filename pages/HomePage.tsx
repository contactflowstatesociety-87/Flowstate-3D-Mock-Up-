
import React from 'react';
import type { User } from '../types';

interface HomePageProps {
  onGetStarted: () => void;
  onNavigate: (view: 'login' | 'register') => void;
  user: User | null;
}

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 18H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onNavigate, user }) => {
  return (
    <div className="flex flex-col min-h-screen bg-surface-DEFAULT text-text">
      <header className="p-4 md:p-6">
        <div className="container mx-auto flex justify-between items-center">
          <img src="https://hfjhiwexlywppvuftjfu.supabase.co/storage/v1/object/public/Flowstate%203D%20Mock%20Up/98A2DE26-3B81-4646-BDF1-BDB932920CF7%202.png.PNG" alt="Company Logo" className="h-20 w-20" />
          <button className="md:hidden">
            <MenuIcon />
          </button>
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <span className="text-text-subtle">Welcome, {user.email}!</span>
                <button onClick={onGetStarted} className="bg-primary px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">Go to Studio</button>
              </>
            ) : (
              <>
                <button onClick={() => onNavigate('login')} className="hover:text-text-subtle">Login</button>
                <button onClick={() => onNavigate('register')} className="bg-primary px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">Sign Up</button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <div className="mb-8">
            <img src="https://hfjhiwexlywppvuftjfu.supabase.co/storage/v1/object/public/Flowstate%203D%20Mock%20Up/Flowstate%20society%20white.png" alt="Flowstate Society Logo" className="h-96 w-auto" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4">
          3D Animated <br /> Mockups in Seconds.
        </h1>
        <p className="max-w-xl text-text-subtle mb-8 text-lg">
          Transform your 2D designs into stunning 3D – complete with wind effects, walking animations, and seamless video exports.
        </p>
        
        <button onClick={onGetStarted} className="bg-primary text-white font-semibold py-3 px-8 rounded-lg text-lg hover:bg-primary-hover transition-all duration-300 transform hover:scale-105">
          Get Started
        </button>
        <p className="text-gray-500 mt-4 text-sm">{user ? 'Start a new project' : 'No sign up required to try!'}</p>

        <div className="mt-16 w-full max-w-2xl px-4">
          <div className="bg-surface-light p-2 md:p-4 rounded-2xl shadow-2xl shadow-primary/10">
            {/* 
              To connect your Supabase video, replace the placeholder URL in the `src` attribute below 
              with the public URL of your MP4 file from your Supabase storage bucket.
            */}
            <video 
              src="https://hfjhiwexlywppvuftjfu.supabase.co/storage/v1/object/public/Flowstate%203D%20Mock%20Up/Spin_front%20to%20back.mp4" 
              className="rounded-lg w-full h-auto"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
