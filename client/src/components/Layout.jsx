import React from 'react';
import { Toaster } from 'sonner';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Home, FileText, Users, Settings, LogOut, ChevronRight, Menu, X, Cpu, PlusCircle } from 'lucide-react';

const Layout = ({ children, activeTab, onNavigate }) => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'library', label: 'Records', icon: FileText },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'templates', label: 'Templates', icon: Settings },
        { id: 'settings', label: 'Settings', icon: Cpu },
    ];

    const handleNavigate = (id) => {
        onNavigate(id);
        setMobileMenuOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-50 w-full overflow-hidden text-slate-900">
            <Toaster position="top-right" richColors closeButton />

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30">
                <div className="flex items-center">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <img src="/favicon.png" alt="Logo" className="h-8 w-8 mr-3 rounded-lg" />
                    <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">Alchemist AI</span>
                </div>
            </header>

            {/* Overlay for mobile */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden glass-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full lg:shadow-none shadow-2xl
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand (Desktop only) */}
                <div
                    className="hidden lg:flex h-16 items-center px-6 border-b border-slate-100 cursor-pointer"
                    onClick={() => handleNavigate('dashboard')}
                >
                    <img src="/favicon.png" alt="Logo" className="h-8 w-8 mr-3 rounded-lg shadow-sm" />
                    <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">Alchemist AI</span>
                </div>

                {/* Mobile Brand in Sidebar (Optional, maybe just spacing) */}
                <div className="lg:hidden h-16 flex items-center px-6 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Menu</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

                    <div className="mb-6">
                        <button
                            onClick={() => handleNavigate('ingest')}
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
                                    onClick={() => handleNavigate(item.id)}
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
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-slate-100">
                    <div
                        onClick={() => signOut()}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors"
                        title="Sign Out"
                    >
                        {user?.imageUrl ? (
                            <img src={user.imageUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                        ) : (
                            <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                                {user?.firstName?.[0] || 'U'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName || 'User'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.primaryEmailAddress?.emailAddress || ''}</p>
                        </div>
                        <LogOut size={16} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col pt-16 lg:pt-0">
                <div className="flex-1 overflow-auto bg-slate-50 transition-all">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
