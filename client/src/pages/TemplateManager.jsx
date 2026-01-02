import React, { useState, useEffect } from 'react';

function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create New State
    const [file, setFile] = useState(null);
    const [analysis, setAnalysis] = useState(null); // { placeholders, schema_suggestion, prompt_suggestion, file_path }

    // Edit Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [promptText, setPromptText] = useState('');
    const [schemaJson, setSchemaJson] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            setTemplates(data || []);
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setAnalysis(null);
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('template', file);

        try {
            const res = await fetch('/api/templates/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error("Analysis Error Payload:", errText);
                throw new Error(`Server ${res.status}: ${errText}`);
            }

            const data = await res.json();
            setAnalysis(data);

            // Pre-fill form
            setName(file.name.replace('.docx', ''));
            setPromptText(data.prompt_suggestion);
            setSchemaJson(JSON.stringify(data.schema_suggestion, null, 2));

        } catch (err) {
            alert("Analysis Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name || !analysis || !promptText || !schemaJson) {
            alert("Please complete all fields");
            return;
        }

        try {
            let parsedSchema;
            try {
                parsedSchema = JSON.parse(schemaJson);
            } catch (e) {
                alert("Invalid JSON Schema");
                return;
            }

            const payload = {
                name,
                description,
                file_path: analysis.file_path,
                prompt_text: promptText,
                schema_json: parsedSchema
            };

            const res = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Template Saved!");
                setFile(null);
                setAnalysis(null);
                fetchTemplates();
            } else {
                const err = await res.json();
                alert("Save Failed: " + err.error);
            }
        } catch (err) {
            alert("Error saving: " + err.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Template Manager</h2>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h3 className="text-lg font-semibold mb-4">1. Upload New Template (.docx)</h3>
                <div className="flex gap-4 items-center">
                    <input
                        type="file"
                        accept=".docx"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={!file || loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Analyzing..." : "Analyze"}
                    </button>
                </div>
            </div>

            {/* Analysis Result / Editor */}
            {analysis && (
                <div className="bg-white p-6 rounded-lg shadow mb-8 border border-indigo-100">
                    <h3 className="text-lg font-semibold mb-4">2. AI Configuration</h3>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt (System Instruction)</label>
                            <textarea
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                rows={15}
                                className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">JSON Schema</label>
                            <textarea
                                value={schemaJson}
                                onChange={(e) => setSchemaJson(e.target.value)}
                                rows={15}
                                className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                        >
                            Save Template
                        </button>
                    </div>
                </div>
            )}

            {/* List Existing */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Existing Templates</h3>
                <ul className="divide-y divide-gray-200">
                    {templates.map(t => (
                        <li key={t.id} className="py-4">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                                    <p className="text-sm text-gray-500">{t.description}</p>
                                </div>
                                <div className="text-xs text-gray-400">ID: {t.id}</div>
                            </div>
                        </li>
                    ))}
                    {templates.length === 0 && <p className="text-gray-500 text-sm">No templates found.</p>}
                </ul>
            </div>

        </div>
    );
}

export default TemplateManager;
