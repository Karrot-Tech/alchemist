import React, { useState, useEffect } from 'react';
import AudioUploader from '../components/AudioUploader';
import TranscriptViewer from '../components/TranscriptViewer';
import { ArrowLeft, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranscription } from '../context/TranscriptionContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthFetch } from '../hooks/useAuthFetch';

const NewSession = () => {
    const navigate = useNavigate();
    const authFetch = useAuthFetch();
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get('draftId');

    const [transcriptData, setTranscriptData] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [patientName, setPatientName] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
    const [doctorNotes, setDoctorNotes] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');

    // Context Integration
    const { uploadAndTranscribe, jobs } = useTranscription();
    const [currentJobId, setCurrentJobId] = useState(null);

    const handleTranscriptionComplete = React.useCallback((data) => {
        // [LEGACY] This is only called if onUploadStart is NOT provided.
        // But we will provide onUploadStart, so this might be dead code 
        // unless we want to keep a local-only fallback.
        setTranscriptData({ text: data.transcript });
        setAudioUrl(data.audioUrl);
        // Only show success toast if it wasn't a background auto-complete (context already toasts)
        // But here we can't easily distinguish, so showing another toast is fine or we suppress it.
        // For now, let's keep it simple.
    }, []);

    // Watch for job completion if we are still here
    useEffect(() => {
        if (!currentJobId || !jobs[currentJobId]) return;

        const job = jobs[currentJobId];
        if (job.status === 'completed' && job.result) {
            // Job finished while user is still on this screen!
            // Auto-advance to the editor view
            handleTranscriptionComplete({
                transcript: job.result.transcript,
                audioUrl: job.result.audioUrl
            });
            setCurrentJobId(null); // Stop watching
        }
    }, [jobs, currentJobId, handleTranscriptionComplete]);

    // Patient Selection State
    const [patients, setPatients] = useState([]);
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);

    useEffect(() => {
        authFetch('/api/patients')
            .then(res => res.json())
            .then(data => setPatients(data || []))
            .catch(err => console.error(err));
    }, [authFetch]);

    // Load Draft if draftId is present
    useEffect(() => {
        if (!draftId) return;

        const loadDraft = async () => {
            try {
                const res = await authFetch(`/api/transcripts/${draftId}`);
                const fullData = await res.json();
                if (!fullData) throw new Error("Failed to load session");

                setTranscriptData({ text: fullData.content });
                setAudioUrl(fullData.audio_url);
                setPatientName(fullData.patient_name === 'Draft Patient' ? '' : (fullData.patient_name || ''));
                setSelectedPatientId(fullData.patient_id || null);
                setRecordDate(fullData.date || new Date().toISOString().split('T')[0]);
                setDoctorNotes(fullData.notes || '');
            } catch (err) {
                console.error(err);
                toast.error("Error loading session: " + err.message);
            }
        };
        loadDraft();
    }, [draftId, authFetch]);

    const handlePatientChange = (e) => {
        const val = e.target.value;
        if (val === 'NEW') {
            setIsCreatingPatient(true);
            setSelectedPatientId(null);
            setPatientName('');
        } else {
            setIsCreatingPatient(false);
            const p = patients.find(pat => pat.id === parseInt(val));
            if (p) {
                setSelectedPatientId(p.id);
                setPatientName(p.name);
            }
        }
    };



    const handleBackgroundUpload = async (file) => {
        // 1. Ensure minimal metadata (Patient Name)
        let finalPatientName = patientName;
        let finalPatientId = selectedPatientId;

        if (isCreatingPatient && patientName) {
            // Must create patient first to have an ID, or just store as string
            // For background job, we'll try to create it here quickly
            try {
                const patRes = await authFetch('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: patientName })
                });
                const patData = await patRes.json();
                if (patData.id) {
                    finalPatientId = patData.id;
                    finalPatientName = patData.name;
                    toast.success(`Created patient: ${finalPatientName}`);
                }
            } catch (err) {
                console.warn("Failed to auto-create patient before upload:", err);
            }
        }

        // 2. Start Job
        toast.info("Upload started in background. You can stay here or navigate away.");

        // Fire & Forget but track ID
        const jobId = await uploadAndTranscribe(file, {
            patientName: finalPatientName || "Draft Patient",
            patientId: finalPatientId,
            date: recordDate,
            doctorNotes
        });
        setCurrentJobId(jobId);
    };

    const handleSaveTranscript = async () => {
        if (!patientName || !recordDate || !transcriptData?.text) {
            toast.error("Please fill in Patient Name and Date.");
            return;
        }
        setSaveStatus('saving');
        try {
            let finalPatientId = selectedPatientId;

            // If creating a new patient on the fly
            if (!finalPatientId && patientName) {
                const patRes = await authFetch('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: patientName })
                });
                const patData = await patRes.json();
                if (patRes.ok && patData.id) {
                    finalPatientId = patData.id;
                    toast.success(`Created new patient: ${patientName}`);
                } else {
                    throw new Error("Failed to auto-create patient: " + (patData.error || 'Unknown error'));
                }
            }

            const res = await authFetch('/api/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: patientName,
                    patient_id: finalPatientId, // Now validated
                    date: recordDate,
                    content: transcriptData.text,
                    notes: doctorNotes,
                    audio_url: audioUrl,
                    assessment_text: null // Initially null, saved from AssessmentStudio later
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus('success');
                toast.success("Patient record saved to Library.");
                setTimeout(() => {
                    navigate(`/records?patientId=${finalPatientId}`);
                }, 1000);
            } else {
                throw new Error(data.error || "Save failed");
            }
        } catch (e) {
            console.error(e);
            toast.error(e.message);
            setSaveStatus('idle');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-10 animate-fade-in text-slate-900">
            <div className="mb-8">
                <button onClick={() => navigate('/dashboard')} className="cursor-pointer text-slate-500 hover:text-indigo-600 font-medium mb-4 flex items-center transition-colors p-2 -ml-2 md:p-0 md:ml-0">
                    <ArrowLeft className="w-6 h-6 md:w-[18px] md:h-[18px] mr-2" />
                    Back to Dashboard
                </button>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Patient Sessions Transcript</h2>
                <p className="text-slate-500 mt-2">Upload a recording or start a new dictation.</p>
            </div>

            {!transcriptData ? (
                <div className="bg-white p-4 md:p-12 rounded-2xl shadow-sm border border-slate-200 text-center transition-all hover:shadow-md">
                    <div className="max-w-md mx-auto">
                        <AudioUploader
                            onTranscriptionComplete={handleTranscriptionComplete}
                            onUploadStart={handleBackgroundUpload}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Metadata Form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
                        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                            <CheckCircle className="text-emerald-500" />
                            <h3 className="text-lg font-bold text-slate-800">Transcription Complete</h3>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient</label>
                                {!isCreatingPatient ? (
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                        onChange={handlePatientChange}
                                        value={selectedPatientId || ""}
                                    >
                                        <option value="" disabled>Select a patient...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.mrn ? `(${p.mrn})` : ''}</option>
                                        ))}
                                        <option value="NEW">+ Create New Patient</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            className="w-full p-4 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                            value={patientName}
                                            onChange={e => setPatientName(e.target.value)}
                                            placeholder="Enter new patient name..."
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => { setIsCreatingPatient(false); setSelectedPatientId(null); setPatientName(''); }}
                                            className="p-4 text-slate-400 hover:text-slate-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="w-full lg:w-48">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Date</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                                    value={recordDate}
                                    onChange={e => setRecordDate(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleSaveTranscript}
                                disabled={saveStatus !== 'idle'}
                                className={`h-[58px] px-8 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 w-full lg:w-auto ${saveStatus === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                            >
                                <Save size={20} />
                                <span>{saveStatus === 'idle' ? 'Save Record' : saveStatus === 'saving' ? 'Saving...' : 'Saved!'}</span>
                            </button>
                        </div>

                        {/* Doctor's Notes */}
                        <div className="mt-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor's Notes (Optional)</label>
                            <textarea
                                className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm text-slate-700 min-h-[100px]"
                                placeholder="Add observations, session context, or specific focus areas..."
                                value={doctorNotes}
                                onChange={e => setDoctorNotes(e.target.value)}
                            />
                        </div>
                    </div>


                    {/* Audio Player */}
                    {audioUrl && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                Session Recording
                            </h3>
                            <audio controls src={audioUrl} className="w-full" />
                        </div>
                    )}

                    {/* Transcript Preview */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Transcript Preview</h3>
                        <TranscriptViewer transcript={transcriptData.text} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewSession;
