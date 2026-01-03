
import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, User, ChevronRight, ArrowLeft, Headphones, ClipboardCheck, Download } from 'lucide-react';
import { toast } from 'sonner';

const TranscriptLibrary = ({ onSelectTranscript, initialPatientId }) => {
    const [patients, setPatients] = useState([]);
    const [transcripts, setTranscripts] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Update selection if prop changes
    useEffect(() => {
        if (initialPatientId) setSelectedPatientId(initialPatientId);
    }, [initialPatientId]);

    useEffect(() => {
        Promise.all([
            fetch('/api/patients').then(r => r.json()),
            fetch('/api/transcripts').then(r => r.json())
        ]).then(([pts, trs]) => {
            setPatients(pts || []);
            setTranscripts(trs || []);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            toast.error("Failed to load patient records");
            setLoading(false);
        });
    }, []);

    // Filter patients based on search
    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.mrn && p.mrn.includes(searchTerm))
    );

    // Get transcripts for selected patient
    const patientRecords = selectedPatientId
        ? transcripts.filter(t => t.patient_id === selectedPatientId).sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    const handleDownload = async (transcript) => {
        try {
            toast.info("Preparing download...");
            // Fetch full transcript details to get the assessments array
            const res = await fetch(`/api/transcripts/${transcript.id}`);
            const fullData = await res.json();

            if (!fullData || !fullData.assessments || fullData.assessments.length === 0) {
                toast.error("No assessment report found to download.");
                return;
            }

            // Get the latest assessment
            const latestAssessment = fullData.assessments[0];
            const finalData = latestAssessment.content;
            const templateId = latestAssessment.template_id;

            const genRes = await fetch('/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: templateId,
                    data: finalData
                }),
            });

            if (!genRes.ok) throw new Error("Document generation failed");

            const blob = await genRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${finalData.patient_name || 'Assessment'}_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("Document downloaded.");
        } catch (error) {
            console.error(error);
            toast.error("Download failed: " + error.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();

        // Add time
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        return `${month}/${day}/${year} • ${displayHours}:${minutes} ${ampm}`;
    };

    return (
        <div className="flex h-full animate-fade-in text-slate-900">
            {/* Left Sidebar: Patient List */}
            {/* Logic: Hidden on mobile IF a patient is selected. Always visible on Desktop */}
            <div className={`w-full lg:w-80 border-r border-slate-200 bg-white flex flex-col ${selectedPatientId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100">
                    <h1 className="text-3xl font-bold text-slate-900 mb-6">Consult Records</h1>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No patients found.</div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {filteredPatients.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPatientId(p.id)}
                                    className={`w-full text-left p-4 hover:bg-slate-100 transition-colors flex items-center justify-between group even:bg-slate-50/50 ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div>
                                        <p className={`font-medium text-sm ${selectedPatientId === p.id ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">{p.mrn || 'No MRN'}</p>
                                    </div>
                                    <ChevronRight size={16} className={`text-slate-300 ${selectedPatientId === p.id ? 'text-indigo-400' : 'group-hover:text-slate-400'}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Patient Records */}
            {/* Logic: Hidden on mobile IF NO patient is selected. Always visible on Desktop */}
            <div className={`flex-1 bg-slate-50 flex flex-col overflow-hidden ${!selectedPatientId ? 'hidden lg:flex' : 'flex'}`}>
                {!selectedPatientId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <User size={32} className="text-slate-300" />
                        </div>
                        <p>Select a patient to view their records.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8">
                        <header className="mb-8">
                            <button
                                onClick={() => setSelectedPatientId(null)}
                                className="lg:hidden flex items-center text-slate-500 mb-4 hover:text-slate-900 font-medium"
                            >
                                <ArrowLeft size={18} className="mr-1" /> Back to Patients
                            </button>
                            <h1 className="text-3xl font-bold text-slate-900">{selectedPatient?.name}</h1>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                <span>MRN: {selectedPatient?.mrn || 'N/A'}</span>
                                {selectedPatient?.dob && <span>DOB: {formatDate(selectedPatient.dob)}</span>}
                            </div>
                        </header>

                        <div>
                            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4">Session History</h3>
                            {patientRecords.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                                    No records found for this patient.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {patientRecords.map(t => (
                                        <div
                                            key={t.id}
                                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                            onClick={() => onSelectTranscript(t)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center space-x-2 text-indigo-600 font-medium">
                                                    <Calendar size={16} />
                                                    <span>{formatDate(t.created_at || t.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {t.audio_url && (
                                                        <span className="text-[10px] font-bold uppercase py-1 px-2 bg-indigo-50 text-indigo-600 rounded-md flex items-center gap-1">
                                                            <Headphones size={10} /> Audio
                                                        </span>
                                                    )}
                                                    {t.assessment_count > 0 && (
                                                        <span className="text-[10px] font-bold uppercase py-1 px-2 bg-emerald-50 text-emerald-600 rounded-md flex items-center gap-1">
                                                            <ClipboardCheck size={10} /> {t.assessment_count > 1 ? `${t.assessment_count} Reports` : 'Report'}
                                                        </span>
                                                    )}
                                                    {t.assessment_count > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(t);
                                                            }}
                                                            className="text-[10px] font-bold uppercase py-1 px-2 bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md flex items-center gap-1 transition-colors border border-slate-200"
                                                        >
                                                            <Download size={10} /> Save
                                                        </button>
                                                    )}
                                                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                        View &rarr;
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 line-clamp-2 text-sm mb-3">
                                                {t.content}
                                            </p>

                                            {t.audio_url && (
                                                <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                                    <audio controls className="h-8 flex-1">
                                                        <source src={t.audio_url} />
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                </div>
                                            )}

                                            {t.notes && (
                                                <div className="text-xs bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-100">
                                                    <strong>Note:</strong> {t.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TranscriptLibrary;
