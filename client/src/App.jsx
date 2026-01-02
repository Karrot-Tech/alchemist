import React, { useState, useEffect } from 'react';
import AudioUploader from './components/AudioUploader';
import TranscriptViewer from './components/TranscriptViewer';
import SOAPEditor from './components/SOAPEditor';
import TemplateManager from './pages/TemplateManager';
import TranscriptLibrary from './pages/TranscriptLibrary';

function App() {
  // Modes: 'dashboard', 'ingest', 'assessment', 'templates'
  const [appMode, setAppMode] = useState('dashboard');

  // Data State
  const [transcriptData, setTranscriptData] = useState(null); // { text, id, patient, date }
  const [soapData, setSoapData] = useState(null);

  // Ingest Form State
  const [patientName, setPatientName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, success

  // Assessment State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);

  useEffect(() => {
    // Load Templates on mount
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error("Failed to load templates", err));
  }, []);

  const handleTranscriptionComplete = (text) => {
    setTranscriptData({ text });
    // Remain in ingest mode to review and save
  };

  const handleSaveTranscript = async () => {
    if (!patientName || !recordDate || !transcriptData?.text) {
      alert("Please fill all fields.");
      return;
    }
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          date: recordDate,
          content: transcriptData.text
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => {
          setAppMode('dashboard');
          setTranscriptData(null);
          setPatientName('');
          setSaveStatus('idle');
        }, 1000);
      }
    } catch (e) {
      alert("Save failed");
      setSaveStatus('idle');
    }
  };

  const startAssessment = async (t) => {
    // The list view might not have the full content (optimization), so fetch it.
    try {
      const res = await fetch(`/api/transcripts/${t.id}`);
      const fullData = await res.json();
      if (!fullData || !fullData.content) throw new Error("Failed to load transcript content");

      setTranscriptData({ text: fullData.content, id: fullData.id, patient: fullData.patient_name });
      setAppMode('assessment');
    } catch (err) {
      console.error(err);
      alert("Error loading transcript: " + err.message);
    }
  };

  const runAssessment = async () => {
    if (!selectedTemplateId) return alert("Select a template");
    setIsAssessmentLoading(true);
    try {
      const res = await fetch('/assess-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptData.text,
          template_id: selectedTemplateId
        }),
      });
      const data = await res.json();
      setSoapData(data);
    } catch (error) {
      alert("Assessment failed");
    } finally {
      setIsAssessmentLoading(false);
    }
  };

  // --- RENDER HELPERS ---

  const renderDashboard = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 mt-20">
      <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Alchemist<span className="text-blue-500">.AI</span></h1>
      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => setAppMode('ingest')}
          className="p-8 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="text-2xl mb-2">🎙️</div>
          <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">New Session</h3>
          <p className="text-gray-500">Record or upload audio, review text, and save to library.</p>
        </button>

        <button
          onClick={() => setAppMode('library')}
          className="p-8 bg-white border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="text-2xl mb-2">📂</div>
          <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600">Open Library</h3>
          <p className="text-gray-500">Access saved patient records and run assessments.</p>
        </button>
      </div>
      <div className="mt-8">
        <button onClick={() => setAppMode('templates')} className="text-gray-500 hover:text-gray-800 underline">Manage Templates</button>
      </div>
    </div>
  );

  const renderIngest = () => (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => setAppMode('dashboard')} className="mb-4 text-blue-600 hover:underline">← Back to Dashboard</button>

      {!transcriptData ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-bold mb-4">Upload Audio</h2>
          <AudioUploader onTranscriptionComplete={handleTranscriptionComplete} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h2 className="text-lg font-bold text-green-800 mb-4">✅ Transcription Complete</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient Name</label>
                <input
                  className="w-full p-2 border rounded"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleSaveTranscript}
              disabled={saveStatus !== 'idle'}
              className={`w-full py-3 rounded font-bold text-white transition-colors ${saveStatus === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saveStatus === 'idle' ? 'Save to Library' : saveStatus === 'saving' ? 'Saving...' : 'Saved!'}
            </button>
          </div>
          <TranscriptViewer transcript={transcriptData.text} />
        </div>
      )}
    </div>
  );

  const renderAssessment = () => (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b p-4 px-6 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => setAppMode('library')} className="text-gray-500 hover:text-gray-800">← Back</button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{transcriptData?.patient || 'Unknown Patient'}</h1>
            <span className="text-xs text-gray-500">Ready for Assessment</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="p-2 border rounded bg-gray-50 min-w-[200px]"
          >
            <option value="" disabled>Select Template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            onClick={runAssessment}
            disabled={isAssessmentLoading || !selectedTemplateId}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {isAssessmentLoading ? 'Analyzing...' : 'Run Assessment'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex bg-gray-50">
        {soapData ? (
          <div className="flex-1 overflow-auto p-8 flex justify-center">
            <div className="w-full max-w-4xl">
              <SOAPEditor initialData={soapData} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto p-6 flex justify-center">
              <div className="w-full max-w-3xl bg-white shadow-sm p-8 rounded-lg min-h-[500px]">
                <h3 className="text-gray-400 font-medium uppercase tracking-wider text-sm mb-4">Transcript Source</h3>
                <div className="prose max-w-none text-gray-600 whitespace-pre-wrap">
                  {transcriptData?.text}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {appMode === 'dashboard' && renderDashboard()}

      {appMode === 'ingest' && renderIngest()}

      {appMode === 'library' && (
        <div>
          <button onClick={() => setAppMode('dashboard')} className="m-6 mb-0 text-blue-600 hover:underline">← Dashboard</button>
          <TranscriptLibrary onSelectTranscript={startAssessment} />
        </div>
      )}

      {appMode === 'assessment' && renderAssessment()}

      {appMode === 'templates' && (
        <div>
          <div className="p-4 border-b bg-white"><button onClick={() => setAppMode('dashboard')}>← Dashboard</button></div>
          <TemplateManager />
        </div>
      )}
    </div>
  );
}

export default App;
