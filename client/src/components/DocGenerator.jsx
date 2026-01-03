import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuthFetch } from '../hooks/useAuthFetch';

const DocGenerator = ({ transcript }) => {
    const authFetch = useAuthFetch();
    const [notes, setNotes] = useState("Focus on the patient's reported symptoms regarding mobility and their current medication list."); // Default from spec
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!transcript) return;
        setIsGenerating(true);
        try {
            const response = await authFetch('/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    assessment_notes: notes,
                    template_name: 'default'
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Generation Failed");
            }

            // Handle Download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Try to get filename from headers content-disposition
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'report.docx';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match && match[1]) filename = match[1];
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Generation failed", error);
            alert("Generation failed: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Generate Document</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Notes / Instructions</label>
                <textarea
                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter instructions for the AI..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    Example: "Focus on the patient's reported symptoms regarding mobility..."
                </p>
            </div>

            <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md mb-4 border border-yellow-200">
                <strong>Note:</strong> Ensure a valid <code>template.docx</code> is present on the server for this to work.
            </div>

            <button
                onClick={handleGenerate}
                disabled={!transcript || isGenerating}
                className={`py-2 px-4 rounded-md text-white font-medium transition-colors w-full flex items-center justify-center gap-2
            ${!transcript || isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isGenerating ? (
                    <>Generating Document...</>
                ) : (
                    <><Sparkles size={16} /> Generate & Download Report</>
                )}
            </button>
        </div>
    );
};

export default DocGenerator;
