import React from 'react';
import { Toaster } from 'sonner';
import { Home, FileText, Users, Settings, LogOut, ChevronRight, Menu, X, Cpu, PlusCircle } from 'lucide-react';

const Layout = ({ children, activeTab, onNavigate }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'library', label: 'Records', icon: FileText },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'templates', label: 'Templates', icon: Settings },
        { id: 'settings', label: 'Settings', icon: Cpu },
    ];

    return (
        <div className="flex h-screen bg-slate-50 w-full overflow-hidden text-slate-900">
            <Toaster position="top-right" richColors closeButton />

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                {/* Brand */}
                <div
                    className="h-16 flex items-center px-6 border-b border-slate-100 cursor-pointer"
                    onClick={() => onNavigate('dashboard')}
                >
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-indigo-200 shadow-md">
                        <span className="text-white font-bold text-xl">A</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-slate-800">Alchemist</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

                    <div className="mb-6">
                        <button
                            onClick={() => onNavigate('ingest')}
                            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
                        >
                            <PlusCircle size={18} />
                            <span className="font-semibold text-sm">New Session</span>
                        </button>
                    </div>

                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</p>
                        <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50">
                            <Settings size={18} />
                            <span>Settings</span>
                        </button>
                    </div>
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div className="h-9 w-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                            DR
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">Dr. Smith</p>
                            <p className="text-xs text-slate-500 truncate">Pro Plan</p>
                        </div>
                        <LogOut size={16} className="text-slate-400" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col">
                <div className="flex-1 overflow-auto bg-slate-50 transition-all">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
