import React, { useState, useEffect } from 'react';
import { Search, Clock, FileText, ChevronRight, Calendar, User, Headphones, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

const ActivityHistory = ({ onSelectTranscript, onSelectDraft }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/transcripts')
            .then(res => res.json())
            .then(data => {
                // Sort by date newest first
                const sorted = (data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
                setSessions(sorted);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load activity history");
                setLoading(false);
            });
    }, []);

    const filtered = sessions.filter(s =>
        (s.patient_name && s.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.content && s.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
        <div className="p-8 max-w-5xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Activity History</h1>
                    <p className="text-slate-500">A comprehensive log of all your clinical sessions.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        placeholder="Search sessions or patients..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading your history...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 italic">No activities found matching your search.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(session => {
                        const isUnassigned = !session.patient_name || session.patient_name === 'Draft Patient';

                        return (
                            <div
                                key={session.id}
                                onClick={() => isUnassigned && onSelectDraft ? onSelectDraft(session) : onSelectTranscript(session)}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group even:bg-slate-50/50"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                                                {(!session.patient_name || session.patient_name === 'Draft Patient') ? 'Unassigned Session' : session.patient_name}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {formatDate(session.created_at || session.date)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        {session.assessment_count > 0 && (
                                            <span className="text-[10px] font-bold uppercase py-1.5 px-3 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1.5 border border-emerald-100">
                                                <ClipboardCheck size={12} /> {session.assessment_count > 1 ? `${session.assessment_count} Reports` : 'Assessment Complete'}
                                            </span>
                                        )}
                                        <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                </div>

                                <div className="px-1">
                                    <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed italic mb-4">
                                        "{session.content || 'No transcript content recorded.'}"
                                    </p>

                                    {session.audio_url && (
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                            <audio controls preload="metadata" className="h-8 flex-1">
                                                <source src={session.audio_url} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActivityHistory;
