import React, { useState, useEffect } from 'react';
import { Mic, FolderOpen, Clock, Settings, UserPlus, FileText, ChevronRight, Activity, Users, Inbox } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = ({ onNavigate }) => {
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

    if (loading) {
        return (
            <div className="p-10 max-w-6xl mx-auto flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                    <p className="text-slate-500">Here is what's happening in your practice today.</p>
                </header>
                <button
                    onClick={() => onNavigate('ingest')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-indigo-200 transition-all hover:-translate-y-0.5"
                >
                    <Mic size={20} />
                    <span>New Session</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: 2x2 Action Grid */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="text-indigo-500" size={20} />
                        Overview & Actions
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatsActionCard
                            title="Session Inbox"
                            count={data.stats.total_drafts || 0}
                            label="Session Inbox"
                            icon={<Inbox />}
                            color="indigo"
                            onClick={() => onNavigate('drafts')}
                        />
                        <StatsActionCard
                            title="Patients"
                            count={data.stats.total_patients}
                            label="Total Patients"
                            icon={<Users />}
                            color="emerald"
                            onClick={() => onNavigate('patients')}
                        />
                        <StatsActionCard
                            title="Records"
                            count={data.stats.total_records || 0}
                            label="Consult Records"
                            icon={<FolderOpen />}
                            color="purple"
                            onClick={() => onNavigate('library')}
                        />
                        <StatsActionCard
                            title="Templates"
                            count={data.stats.total_templates || 0}
                            label="Clinical Templates"
                            icon={<FileText />}
                            color="yellow"
                            onClick={() => onNavigate('templates')}
                        />
                    </div>
                </div>

                {/* Sidebar: Recent Activity */}
                <div className="h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Recent Activity
                        </h2>
                        <button onClick={() => onNavigate('library')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="space-y-4">
                            {data.recentActivity.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">No recent sessions found.</p>
                            ) : (
                                data.recentActivity.map(activity => (
                                    <div key={activity.id} className="relative pl-4 border-l-2 border-slate-100 py-1 hover:border-indigo-200 transition-colors group">
                                        <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors ring-2 ring-white"></div>
                                        <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                            {(!activity.patient || activity.patient === 'Draft Patient') ? 'New Session' : activity.patient}
                                        </p>
                                        <p className="text-xs text-slate-500 mb-1">{activity.date}</p>
                                        <p className="text-xs text-slate-400 line-clamp-1">{activity.summary}</p>
                                    </div>
                                ))
                            )}
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
            className={`relative p-6 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-200 text-left group flex flex-col justify-between h-40 ${theme.hover} hover:-translate-y-1`}
        >
            <div className="flex justify-between items-start w-full">
                <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} transition-transform group-hover:scale-110`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                    <ChevronRight size={20} />
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{count}</h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</p>
            </div>
        </button>
    );
};

export default Dashboard;
