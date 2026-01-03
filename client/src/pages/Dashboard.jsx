import React, { useState, useEffect } from 'react';
import { Mic, FolderOpen, Clock, Settings, UserPlus, FileText, ChevronRight, Activity, Users, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: { total_patients: 0, total_sessions: 0, total_records: 0, total_templates: 0 },
        recentActivity: []
    });

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => {
                if (!res.ok) throw new Error("Failed to load dashboard data");
                return res.json();
            })
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Could not load dashboard stats");
                setLoading(false);
            });
    }, []);

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

    if (loading) {
        return (
            <div className="p-10 max-w-6xl mx-auto flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Hi {user?.firstName || 'there'}</h1>
                    <p className="text-slate-500">Here is what's happening in your practice.</p>
                </header>
                <button
                    onClick={() => navigate('/new-session')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                    <Mic size={20} />
                    <span>New Session</span>
                </button>
            </div>

            {/* Stats Overview Row - 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
                <StatsActionCard
                    title="Session Inbox"
                    count={data.stats.total_drafts || 0}
                    label="Session Inbox"
                    icon={<Inbox />}
                    color="indigo"
                    onClick={() => navigate('/drafts')}
                />
                <StatsActionCard
                    title="Patients"
                    count={data.stats.total_patients || 0}
                    label="Total Patients"
                    icon={<Users />}
                    color="emerald"
                    onClick={() => navigate('/patients')}
                />
                <StatsActionCard
                    title="Records"
                    count={data.stats.total_records || 0}
                    label="Consult Records"
                    icon={<FolderOpen />}
                    color="purple"
                    onClick={() => navigate('/records')}
                />
                <StatsActionCard
                    title="Templates"
                    count={data.stats.total_templates || 0}
                    label="Clinical Templates"
                    icon={<FileText />}
                    color="yellow"
                    onClick={() => navigate('/templates')}
                />
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Recent Activity - Now Full Width */}
                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-indigo-500" size={20} />
                            Recent Activity
                        </h2>
                        {data.stats.total_sessions > 5 && (
                            <button onClick={() => navigate('/activity')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8">
                        <div className="relative">
                            {/* Vertical Line */}
                            {data.recentActivity.length > 1 && (
                                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-100"></div>
                            )}

                            <div className="space-y-8">
                                {data.recentActivity.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <Activity size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm italic">No recent sessions found.</p>
                                    </div>
                                ) : (
                                    data.recentActivity.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="relative flex gap-6 group cursor-pointer"
                                            onClick={() => {
                                                const isUnassigned = !activity.patient || activity.patient === 'Draft Patient';
                                                if (isUnassigned) {
                                                    navigate(`/new-session?draftId=${activity.id}`);
                                                } else {
                                                    navigate(`/assessment/${activity.id}`);
                                                }
                                            }}
                                        >
                                            {/* dot */}
                                            <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-600 transition-all shadow-sm group-hover:shadow-indigo-100 group-hover:scale-110">
                                                <FileText size={18} />
                                            </div>

                                            <div className="flex-1 pt-0.5">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-2">
                                                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {(!activity.patient || activity.patient === 'Draft Patient') ? 'Unassigned Session' : activity.patient}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                                                        {formatDate(activity.created_at || activity.date)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed pr-8">
                                                    {activity.summary}
                                                </p>
                                            </div>

                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                                <ChevronRight size={20} className="text-indigo-400" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// New Unified Component
const StatsActionCard = ({ title, count, label, icon, color, onClick }) => {
    const theme = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:border-indigo-300 hover:shadow-indigo-100' },
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', hover: 'hover:border-yellow-300 hover:shadow-yellow-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:border-purple-300 hover:shadow-purple-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:border-emerald-300 hover:shadow-emerald-100' },
    }[color || 'indigo'];

    return (
        <button
            onClick={onClick}
            className={`relative p-3 md:p-4 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-200 text-left group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${theme.hover} hover:-translate-y-1`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${theme.bg} ${theme.text} transition-transform group-hover:scale-110`}>
                    {React.cloneElement(icon, { size: 20 })}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{count}</h3>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</p>
            </div>

            <div className="hidden xl:block opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 shrink-0">
                <ChevronRight size={16} />
            </div>
        </button>
    );
};

export default Dashboard;
