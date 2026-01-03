import React, { useState, useEffect } from 'react';
import { Search, Clock, FileText, ChevronRight, Calendar, User, Headphones, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthFetch } from '../hooks/useAuthFetch';

const ActivityHistory = () => {
    const navigate = useNavigate();
    const authFetch = useAuthFetch();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true); // Initial load
    const [loadingMore, setLoadingMore] = useState(false); // Pagination load
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    // Debounce search term
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        // Reset list when search changes
        setPage(1);
        setSessions([]);
        setHasMore(true);
        fetchSessions(1, debouncedSearch, true);
    }, [debouncedSearch]);

    const fetchSessions = async (pageNum, search, isReset = false) => {
        if (isReset) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({
                page: pageNum,
                limit: LIMIT,
                offset: (pageNum - 1) * LIMIT,
                lean: 'true' // Don't need full heavy content
            });

            if (search) params.append('search', search);

            const res = await authFetch(`/api/transcripts?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load");

            const data = await res.json();

            if (data.length < LIMIT) {
                setHasMore(false);
            }

            setSessions(prev => isReset ? data : [...prev, ...data]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchSessions(nextPage, debouncedSearch);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString() + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            ) : sessions.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 italic">No activities found matching your search.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => {
                        const isUnassigned = !session.patient_name || session.patient_name === 'Draft Patient';

                        return (
                            <div
                                key={session.id}
                                onClick={() => {
                                    if (isUnassigned) {
                                        navigate(`/new-session?draftId=${session.id}`);
                                    } else {
                                        navigate(`/assessment/${session.id}`);
                                    }
                                }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group even:bg-slate-100/40"
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

                    {hasMore && (
                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm hover:bg-slate-50 disabled:opacity-50 text-sm font-medium transition-all"
                            >
                                {loadingMore ? "Loading..." : "Load More Activity"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityHistory;
