import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, Edit, ChevronRight, Clipboard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DraftsView = ({ onSelectTranscript }) => {
    const [transcripts, setTranscripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/transcripts')
            .then(r => r.json())
            .then(data => {
                // Filter for drafts: No patient ID OR Name is "Draft Patient"
                const drafts = (data || []).filter(t =>
                    !t.patient_id || t.patient_name === 'Draft Patient'
                );
                setTranscripts(drafts);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load drafts");
                setLoading(false);
            });
    }, []);

    const filteredDrafts = transcripts.filter(t =>
        (t.content && t.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.date && t.date.includes(searchTerm))
    );

    return (
        <div className="h-full flex flex-col bg-slate-50 p-8 animate-fade-in text-slate-900">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Sessions Inbox</h1>
                    <p className="text-slate-500 mt-2">Unassigned recordings and sessions.</p>
                </div>
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Search inbox..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredDrafts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Edit size={32} className="text-slate-300" />
                    </div>
                    <p>No sessions found in inbox.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
                    {filteredDrafts.map(t => (
                        <div
                            key={t.id}
                            onClick={() => onSelectTranscript(t)}
                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-64"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-2 text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md text-xs">
                                    <Calendar size={14} />
                                    <span>{t.date}</span>
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    Assess &rarr;
                                </span>
                            </div>

                            <div className="flex-1 overflow-hidden relative mb-4">
                                <p className="text-slate-600 text-sm line-clamp-6">
                                    {t.content || "No transcript content available."}
                                </p>
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Clipboard size={12} /> {t.content ? t.content.length : 0} chars
                                </span>
                                {t.audio_url && <span className="font-medium text-emerald-600">Audio Attached</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DraftsView;
