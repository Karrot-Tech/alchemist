
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, Pencil, Trash2 } from 'lucide-react'; // Added Trash2

function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Form State
    const [file, setFile] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [promptText, setPromptText] = useState('');
    const [schemaJson, setSchemaJson] = useState('{}');
    const [filePath, setFilePath] = useState(null); // Server path

    // Edit State
    const [editingTemplate, setEditingTemplate] = useState(null);
    const saveSectionRef = React.useRef(null);

    // ... useEffect ...

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            if (res.ok) {
                setTemplates(data);
            } else {
                toast.error("Failed to load templates");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleAnalyze = async () => {
        if (!file) return toast.error("Please select a file first");
        setAnalyzing(true);
        const formData = new FormData();
        formData.append('template', file);

        try {
            const res = await fetch('/api/templates/analyze', { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                setPromptText(data.prompt_suggestion);
                setSchemaJson(JSON.stringify(data.schema_suggestion, null, 2));
                setFilePath(data.file_path);
                toast.success("Analysis complete. Please review and save below.");
                // Smooth scroll to the save section
                setTimeout(() => {
                    saveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            } else {
                toast.error("Analysis failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Analysis error");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRefreshSchema = async () => {
        if (!editingTemplate) return;
        setRefreshing(true);
        try {
            const res = await fetch('/api/templates/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template_id: editingTemplate.id })
            });
            const data = await res.json();

            if (res.ok) {
                setPromptText(data.prompt_suggestion);
                setSchemaJson(JSON.stringify(data.schema_suggestion, null, 2));
                toast.success("Schema refreshed from original file");
            } else {
                toast.error("Refresh failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Refresh error");
        } finally {
            setRefreshing(false);
        }
    };

    const handleSave = async () => {
        if (!name || !promptText || !schemaJson) return toast.error("Missing required fields");
        if (!editingTemplate && !file) return toast.error("Please select a template file");

        try {
            JSON.parse(schemaJson); // Validate JSON
        } catch (e) {
            return toast.error("Invalid JSON Schema format");
        }

        const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates'; // Fixed URL spacing
        const method = editingTemplate ? 'PUT' : 'POST';

        let body, headers;

        if (editingTemplate) {
            // Update: JSON is fine
            headers = { 'Content-Type': 'application/json' };
            body = JSON.stringify({
                name,
                description,
                prompt_text: promptText,
                schema_json: schemaJson
            });
        } else {
            // Create: Must be FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', name);
            formData.append('description', description);
            formData.append('prompt_text', promptText);
            formData.append('schema_json', schemaJson);

            body = formData;
            // No Content-Type header for FormData; browser sets it with boundary
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: headers,
                body: body
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(editingTemplate ? "Template updated" : "Template saved");
                fetchTemplates();
                resetForm();
            } else {
                toast.error(`Save failed: ${data.error} ${data.message ? `(${data.message})` : ''}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Save error");
        }
    };

    const startEdit = (t) => {
        setEditingTemplate(t);
        setName(t.name);
        setDescription(t.description);
        setPromptText(t.prompt_text);
        try {
            const obj = JSON.parse(t.schema_json);
            setSchemaJson(JSON.stringify(obj, null, 2));
        } catch (e) {
            setSchemaJson(t.schema_json);
        }
        setFilePath(t.file_path);
        setFile(null);
    };

    const resetForm = () => {
        setEditingTemplate(null);
        setName(''); setDescription(''); setPromptText(''); setSchemaJson('{}');
        setFile(null); setFilePath(null);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = "";
    };

    const handleDelete = async () => {
        if (!editingTemplate) return;
        if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/templates/${editingTemplate.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Template deleted");
                fetchTemplates();
                resetForm();
            } else {
                const data = await res.json();
                toast.error("Delete failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
            toast.error("Delete error");
        }
    };

    return (
        <div className="px-8 py-8 max-w-6xl mx-auto animate-fade-in pb-20 text-slate-900">
            {/* Header ... */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Manager</h1>
                    <p className="text-slate-500">Upload DOCX templates to define assessments.</p>
                </div>
                {editingTemplate && (
                    <button onClick={resetForm} className="text-slate-500 hover:text-slate-800 font-medium px-4 py-2 hover:bg-slate-100 rounded-lg transition-all">
                        Cancel Edit
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Editor */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="font-bold text-lg mb-4 text-slate-800">{editingTemplate ? `Edit: ${editingTemplate.name}` : '1. Upload & Analyze'}</h2>

                        {!editingTemplate ? (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Template File (.docx)</label>
                                <div className="flex gap-2">
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".docx"
                                        disabled={analyzing} // Disabled when analyzing
                                        onChange={e => {
                                            const selectedFile = e.target.files[0];
                                            if (selectedFile) {
                                                setFile(selectedFile);
                                                // Auto-fill name logic
                                                if (!name) {
                                                    const cleanName = selectedFile.name
                                                        .replace(/\.docx?$/i, '')
                                                        .replace(/[_-]/g, ' ')
                                                        .replace(/\b\w/g, c => c.toUpperCase());
                                                    setName(cleanName);
                                                }
                                            }
                                        }}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing || !file}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {analyzing ? 'Analyzing...' : 'Analyze'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <p className="text-sm text-slate-500 mb-2">Editing template file: <span className="font-mono text-xs">{editingTemplate.file_path}</span></p>
                                <button
                                    onClick={handleRefreshSchema}
                                    disabled={refreshing}
                                    className="text-indigo-600 text-sm font-bold hover:underline flex items-center"
                                >
                                    {refreshing ? 'Refreshing...' : '↻ Refresh Schema from File'}
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Display Name</label>
                                <input className="w-full p-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Initial Assessment" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                                <input className="w-full p-2 border rounded-lg" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" ref={saveSectionRef}>
                        <h2 className="font-bold text-lg mb-4 text-slate-800">2. Review AI Configuration</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prompt Instructions</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg h-32 text-sm font-mono"
                                    value={promptText}
                                    onChange={e => setPromptText(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">JSON Schema</label>
                                <textarea
                                    className="w-full p-3 border rounded-lg h-48 text-sm font-mono"
                                    value={schemaJson}
                                    onChange={e => setSchemaJson(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all"
                                >
                                    {editingTemplate ? 'Update Template' : 'Save Template'}
                                </button>
                                {editingTemplate && (
                                    <button
                                        onClick={handleDelete}
                                        className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 transition-all"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: List */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                    <h2 className="font-bold text-lg mb-6 text-slate-800">Existing Templates</h2>
                    {loading ? (
                        <p className="text-slate-400">Loading...</p>
                    ) : templates.length === 0 ? (
                        <p className="text-slate-400">No templates found.</p>
                    ) : (
                        <div className="space-y-3">
                            {templates.map(t => (
                                <div key={t.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{t.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                                        </div>
                                        <button
                                            onClick={() => startEdit(t)}
                                            className="text-slate-400 hover:text-indigo-600 p-2 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Edit Template"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TemplateManager;
