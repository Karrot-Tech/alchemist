import React, { useState, useEffect } from 'react';
import AudioUploader from '../components/AudioUploader';
import TranscriptViewer from '../components/TranscriptViewer';
import { ArrowLeft, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

const NewSession = ({ onNavigate }) => {
    const [transcriptData, setTranscriptData] = useState(null); // { text }
    const [patientName, setPatientName] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
    const [doctorNotes, setDoctorNotes] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');

    // Patient Selection State
    const [patients, setPatients] = useState([]);
    const [isCreatingPatient, setIsCreatingPatient] = useState(false);

    useEffect(() => {
        fetch('/api/patients')
            .then(res => res.json())
            .then(data => setPatients(data || []))
            .catch(err => console.error(err));
    }, []);

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

    const handleTranscriptionComplete = (text) => {
        setTranscriptData({ text });
        toast.success("Audio transcribed successfully.");
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
                const patRes = await fetch('/api/patients', {
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

            const res = await fetch('/api/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: patientName,
                    patient_id: finalPatientId, // Now validated
                    date: recordDate,
                    content: transcriptData.text,
                    notes: doctorNotes
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus('success');
                toast.success("Patient record saved to Library.");
                setTimeout(() => {
                    onNavigate('dashboard');
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
        <div className="max-w-4xl mx-auto p-10 animate-fade-in text-slate-900">
            <div className="mb-8">
                <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-indigo-600 font-medium mb-4 flex items-center transition-colors">
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Dashboard
                </button>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">New Patient Session</h2>
                <p className="text-slate-500 mt-2">Upload a recording or start a new dictation.</p>
            </div>

            {!transcriptData ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center transition-all hover:shadow-md">
                    <div className="max-w-md mx-auto">
                        <AudioUploader onTranscriptionComplete={handleTranscriptionComplete} />
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

                        <div className="flex items-end gap-6">
                            <div className="flex-1">
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
                            <div className="w-48">
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
                                className={`h-[58px] px-8 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center space-x-2 ${saveStatus === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
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
