import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import TranscriptLibrary from './pages/TranscriptLibrary';
import AssessmentStudio from './pages/AssessmentStudio';
import TemplateManager from './pages/TemplateManager';
import PatientManager from './pages/PatientManager';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';

function App() {
  const [activeTab, setActiveTab] = useState('ingest');
  const [appMode, setAppMode] = useState('dashboard');
  const [transcriptData, setTranscriptData] = useState(null);

  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Intercept fetch to add token
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource] = args;
      const url = typeof resource === 'string' ? resource : resource instanceof URL ? resource.toString() : '';

      // PROFOUND FIX: Only intercept requests to our backend (/api).
      // Otherwise we deadlock Clerk's own loading requests which uses fetch!
      if (url.startsWith('/api') || url.startsWith('http://localhost:3000')) {
        try {
          const token = await getToken();
          if (token) {
            const [_, config] = args; // re-destructure to get config
            const newConfig = { ...config, headers: { ...config?.headers, Authorization: `Bearer ${token}` } };
            return originalFetch(resource, newConfig);
          }
        } catch (err) {
          console.error("Token fetch error", err);
        }
      }
      return originalFetch(...args);
    };
    return () => { window.fetch = originalFetch; };
  }, [getToken]);

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

  const startAssessment = async (t) => {
    try {
      const res = await fetch(`/api/transcripts/${t.id}`);
      const fullData = await res.json();
      if (!fullData || !fullData.content) throw new Error("Failed to load transcript content");

      setTranscriptData({ text: fullData.content, id: fullData.id, patient: fullData.patient_name, notes: fullData.notes });
      handleNavigate('assessment');
    } catch (err) {
      console.error(err);
      toast.error("Error loading transcript: " + err.message);
    }
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setAppMode(tab); // Keep appMode in sync if it's still used elsewhere
  };

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Layout activeTab={activeTab} onNavigate={handleNavigate}>
          {appMode === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}

          {appMode === 'ingest' && <NewSession onNavigate={handleNavigate} />}

          {appMode === 'library' && <TranscriptLibrary onSelectTranscript={startAssessment} />}

          {appMode === 'assessment' && (
            <AssessmentStudio
              transcriptData={transcriptData}
              onNavigate={handleNavigate}
            />
          )}

          {appMode === 'templates' && <TemplateManager />}

          {appMode === 'patients' && <PatientManager />}

          {appMode === 'settings' && <Settings />}
        </Layout>
      </SignedIn>
    </>
  );
}

export default App;
