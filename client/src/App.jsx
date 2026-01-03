
import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { TranscriptionProvider } from './context/TranscriptionContext';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import TranscriptLibrary from './pages/TranscriptLibrary';
import AssessmentStudio from './pages/AssessmentStudio';
import TemplateManager from './pages/TemplateManager';
import PatientManager from './pages/PatientManager';
import DraftsView from './pages/DraftsView';
import ActivityHistory from './pages/ActivityHistory';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import OnboardingTour from './components/OnboardingTour';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('alchemist_onboarding_completed');
  });
  const { isLoaded } = useAuth();

  // Onboarding Check


  const handleOnboardingComplete = () => {
    localStorage.setItem('alchemist_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Global fetch interceptor removed in favor of useAuthFetch hook

  // Loading Timeout
  const [showTimeoutError, setShowTimeoutError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) setShowTimeoutError(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
        <div className="flex flex-col items-center gap-4">
          {showTimeoutError ? (
            <>
              <div className="text-red-500 text-xl font-bold">Authentication Timeout</div>
              <p className="text-slate-500 max-w-md text-center">
                Clerk failed to initialize. Please check your network connection or try reloading.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-medium"
              >
                Reload Page
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="text-slate-500">Initializing Authentication...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <TranscriptionProvider>
          {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/new-session" element={<NewSession />} />
              <Route path="/drafts" element={<DraftsView />} />
              <Route path="/records" element={<TranscriptLibrary />} />
              <Route path="/assessment/:id" element={<AssessmentStudio />} />
              <Route path="/templates" element={<TemplateManager />} />
              <Route path="/patients" element={<PatientManager />} />
              <Route path="/activity" element={<ActivityHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </TranscriptionProvider>
      </SignedIn>
    </BrowserRouter>
  );
}

export default App;
