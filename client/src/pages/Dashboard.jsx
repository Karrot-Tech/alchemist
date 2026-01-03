
import React, { useState, useEffect } from 'react';
import { Mic, FolderOpen, Clock, Settings, UserPlus, FileText, ChevronRight, Activity } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: { total_patients: 0, total_sessions: 0, hours_saved: 0, total_templates: 0 },
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
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-500">Here is what's happening in your practice today.</p>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard
                    label="Active Patients"
                    value={data.stats.total_patients}
                    icon={<UserIcon size={18} />}
                    color="indigo"
                    onClick={() => onNavigate('patients')}
                />
                <StatCard
                    label="Total Sessions"
                    value={data.stats.total_sessions}
                    icon={<FileText size={18} />}
                    color="purple"
                    onClick={() => onNavigate('library')}
                />
                <StatCard
                    label="Templates"
                    value={data.stats.total_templates || 0}
                    icon={<Settings size={18} />}
                    color="emerald"
                    onClick={() => onNavigate('templates')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Quick Actions */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ActionCard
                                title="New Session"
                                subtitle="Record or upload audio"
                                icon={<Mic size={24} />}
                                color="indigo"
                                onClick={() => onNavigate('ingest')}
                            />
                            <ActionCard
                                title="Patient Records"
                                subtitle="Browse transcripts"
                                icon={<FolderOpen size={24} />}
                                color="purple"
                                onClick={() => onNavigate('library')}
                            />
                            <ActionCard
                                title="Manage Patients"
                                subtitle="Add or edit details"
                                icon={<UserPlus size={24} />}
                                color="cyan"
                                onClick={() => onNavigate('patients')}
                            />
                            <ActionCard
                                title="Templates"
                                subtitle="Customize formats"
                                icon={<FileText size={24} />}
                                color="orange"
                                onClick={() => onNavigate('templates')}
                            />
                        </div>
                    </section>
                </div>

                {/* Sidebar: Recent Activity */}
                <div className="h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Recent Activity
                        </h2>
                        <button onClick={() => onNavigate('library')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="space-y-4">
                            {data.recentActivity.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">No recent sessions found.</p>
                            ) : (
                                data.recentActivity.map(activity => (
                                    <div key={activity.id} className="relative pl-4 border-l-2 border-slate-100 py-1 hover:border-indigo-200 transition-colors group">
                                        <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors ring-2 ring-white"></div>
                                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{activity.patient || 'Unknown Patient'}</p>
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

// Sub-components for cleaner code
const StatCard = ({ label, value, icon, color, onClick }) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
    }[color] || 'bg-slate-50 text-slate-600';

    return (
        <button
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all text-left w-full ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex justify-between items-start w-full">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                    {icon}
                </div>
            </div>
            <span className="text-3xl font-bold text-slate-900">{value}</span>
        </button>
    );
};

const ActionCard = ({ title, subtitle, icon, color, onClick }) => {
    const bgColors = {
        indigo: 'group-hover:bg-indigo-600',
        purple: 'group-hover:bg-purple-600',
        cyan: 'group-hover:bg-cyan-600',
        orange: 'group-hover:bg-orange-500',
    };
    const textColors = {
        indigo: 'text-indigo-600',
        purple: 'text-purple-600',
        cyan: 'text-cyan-600',
        orange: 'text-orange-500',
    };
    const bgLight = {
        indigo: 'bg-indigo-50',
        purple: 'bg-purple-50',
        cyan: 'bg-cyan-50',
        orange: 'bg-orange-50',
    };

    return (
        <button
            onClick={onClick}
            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all text-left flex items-center space-x-4 group"
        >
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${bgLight[color]} ${textColors[color]} ${bgColors[color]} group-hover:text-white`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-slate-400 text-xs">{subtitle}</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </button>
    );
};

const UserIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

export default Dashboard;
