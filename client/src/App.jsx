import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
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
  const [activeTab, setActiveTab] = useState('ingest');
  const [appMode, setAppMode] = useState('dashboard');
  const [transcriptData, setTranscriptData] = useState(null);
  const [currentSessionData, setCurrentSessionData] = useState(null); // For resuming drafts
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [libraryParams, setLibraryParams] = useState(null);

  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Onboarding Check
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const hasSeenOnboarding = localStorage.getItem('alchemist_onboarding_completed');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, isSignedIn]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('alchemist_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Intercept fetch to add token
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource] = args;
      const url = typeof resource === 'string' ? resource : resource instanceof URL ? resource.toString() : '';

      // PROFOUND FIX: Only intercept requests to our backend (/api).
      // Otherwise we deadlock Clerk's own loading requests which uses fetch!
      // Also strictly include other backend routes that are not prefixed with /api
      const isBackendRoute = url.startsWith('/api') ||
        url.startsWith('/transcribe') ||
        url.startsWith('/assess-soap') ||
        url.startsWith('/validate') ||
        url.startsWith('/generate-document') ||
        url.startsWith('http://localhost:3000');

      if (isBackendRoute) {
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

      setTranscriptData({
        text: fullData.content,
        id: fullData.id,
        patient: fullData.patient_name,
        notes: fullData.notes,
        assessments: fullData.assessments,
        assessment: fullData.assessment_text
      });
      handleNavigate('assessment');
    } catch (err) {
      console.error(err);
      toast.error("Error loading transcript: " + err.message);
    }
  };

  const resumeSession = async (t) => {
    // Navigate to 'ingest' (NewSession) with pre-filled data
    setCurrentSessionData({
      content: t.content,
      audio_url: t.audio_url,
      patient_name: t.patient_name === 'Draft Patient' ? '' : t.patient_name,
      patient_id: t.patient_id,
      date: t.date,
      notes: t.notes
    });
    handleNavigate('ingest');
  };


  const resumeById = async (id) => {
    try {
      const res = await fetch(`/api/transcripts/${id}`);
      const fullData = await res.json();
      if (!fullData) throw new Error("Failed to load session");

      resumeSession(fullData);
    } catch (err) {
      console.error(err);
      toast.error("Error loading session: " + err.message);
    }
  };

  const handleNavigate = (tab, params = null) => {
    setActiveTab(tab);
    setAppMode(tab);
    if (tab === 'library' && params) {
      setLibraryParams(params);
    }
    if (tab === 'assessment' && params?.transcriptId) {
      startAssessment({ id: params.transcriptId });
    }
    if (tab === 'ingest' && params?.transcriptId) {
      resumeById(params.transcriptId);
    }
  };

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <TranscriptionProvider>
          {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}
          <Layout activeTab={activeTab} onNavigate={handleNavigate}>
            {appMode === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}

            {appMode === 'ingest' && (
              <NewSession
                onNavigate={handleNavigate}
                initialSessionData={currentSessionData}
              />
            )}

            {appMode === 'drafts' && <DraftsView onSelectTranscript={resumeSession} />}

            {appMode === 'library' && (
              <TranscriptLibrary
                onSelectTranscript={startAssessment}
                initialPatientId={libraryParams?.patientId}
              />
            )}

            {appMode === 'assessment' && (
              <AssessmentStudio
                transcriptData={transcriptData}
                onNavigate={handleNavigate}
              />
            )}

            {appMode === 'templates' && <TemplateManager />}

            {appMode === 'patients' && <PatientManager />}

            {appMode === 'activity' && (
              <ActivityHistory
                onSelectTranscript={startAssessment}
                onSelectDraft={resumeSession}
              />
            )}

            {appMode === 'settings' && <Settings />}
          </Layout>
        </TranscriptionProvider>
      </SignedIn>
    </>
  );
}

export default App;
