import React, { useState, useEffect } from 'react';
import { Bot, Cpu, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthFetch } from '../hooks/useAuthFetch';

const Settings = () => {
    const authFetch = useAuthFetch();
    const [agents, setAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [promptContent, setPromptContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadAgent = React.useCallback(async (id) => {
        try {
            const res = await authFetch(`/api/system-prompts/${id}`);
            const data = await res.json();
            setSelectedAgent(data.id);
            setPromptContent(data.content);
        } catch {
            toast.error("Failed to load prompt");
        }
    }, [authFetch]);

    useEffect(() => {
        authFetch('/api/system-prompts')
            .then(res => res.json())
            .then(data => {
                setAgents(data);
                if (data.length > 0) loadAgent(data[0].id);
                setLoading(false);
            })
            .catch(() => toast.error("Failed to load agents"));
    }, [authFetch, loadAgent]);

    const handleSave = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        try {
            const res = await authFetch(`/api/system-prompts/${selectedAgent}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: promptContent })
            });
            if (res.ok) toast.success("System prompt updated");
            else throw new Error("Failed");
        } catch {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in text-slate-900">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">System Brains & Agents</h1>
                <p className="text-slate-500 mt-1">Tune the AI personas that power the Alchemist platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Agent List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {loading ? <p>Loading brains...</p> : agents.map(agent => (
                        <button
                            key={agent.id}
                            onClick={() => loadAgent(agent.id)}
                            className={`w-full h-full lg:h-auto text-left p-4 rounded-xl border transition-all flex items-start space-x-4
                                ${selectedAgent === agent.id
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                        >
                            <div className={`p-2 rounded-lg ${selectedAgent === agent.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className={`font-bold ${selectedAgent === agent.id ? 'text-white' : 'text-slate-800'}`}>{agent.name}</h3>
                                <p className={`text-xs mt-1 ${selectedAgent === agent.id ? 'text-indigo-100' : 'text-slate-500'}`}>{agent.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[600px]">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Cpu size={20} className="text-indigo-500" />
                            Core Instruction Set
                        </h2>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            className="w-full h-full p-4 bg-slate-900 text-slate-100 font-mono text-sm rounded-xl resize-none focus:ring-2 ring-indigo-500 outline-none"
                            value={promptContent}
                            onChange={e => setPromptContent(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        Caution: Modifying these system prompts will affect all future operations for this agent.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
