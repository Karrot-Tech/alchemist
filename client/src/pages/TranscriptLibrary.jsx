import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const TranscriptLibrary = ({ onSelectTranscript }) => {
    const [patients, setPatients] = useState([]);
    const [transcripts, setTranscripts] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            toast.error("Failed to load records");
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

    return (
        <div className="flex h-full animate-fade-in text-slate-900">
            {/* Left Sidebar: Patient List */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-lg mb-4 text-slate-800">Records</h2>
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
                        <div className="divide-y divide-slate-50">
                            {filteredPatients.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPatientId(p.id)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div>
                                        <p className={`font-medium text-sm ${selectedPatientId === p.id ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">{p.mrn || 'No MRN'}</p>
                                    </div>
                                    <ChevronRight size={16} className={`text-slate-300 ${selectedPatientId === p.id ? 'text-indigo-400' : 'group-hover:text-slate-400'}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Main: Patient Records */}
            <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
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
                            <h1 className="text-3xl font-bold text-slate-900">{selectedPatient?.name}</h1>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                                <span>MRN: {selectedPatient?.mrn || 'N/A'}</span>
                                {selectedPatient?.dob && <span>DOB: {selectedPatient.dob}</span>}
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
                                                    <span>{t.date}</span>
                                                </div>
                                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    View Analysis &rarr;
                                                </span>
                                            </div>
                                            <p className="text-slate-600 line-clamp-2 text-sm mb-3">
                                                {t.content}
                                            </p>
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
