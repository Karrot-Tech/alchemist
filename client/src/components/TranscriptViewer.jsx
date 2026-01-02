import React, { useState } from 'react';

const TranscriptViewer = ({ transcript, onTranscriptChange, onValidationReceived }) => {
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    const handleValidate = async () => {
        if (!transcript) return;
        setIsValidating(true);
        try {
            const response = await fetch('/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript }),
            });
            const data = await response.json();
            setValidationResult(data);
            if (onValidationReceived) onValidationReceived(data);
        } catch (error) {
            console.error("Validation failed", error);
            alert("Validation failed: " + error.message);
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Transcript & Validation</h2>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transcript Text (Editable)</label>
                <textarea
                    className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={transcript}
                    onChange={(e) => onTranscriptChange(e.target.value)}
                    placeholder="Transcript will appear here..."
                />
            </div>

            <button
                onClick={handleValidate}
                disabled={!transcript || isValidating}
                className={`py-2 px-4 rounded-md text-white font-medium transition-colors
            ${!transcript || isValidating ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
                {isValidating ? 'Analyzing Quality...' : 'Validate Transcript'}
            </button>

            {validationResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <h3 className="font-semibold text-lg mb-2">Quality Assessment</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <span className="text-gray-600">Score:</span>
                            <span className={`ml-2 font-bold ${validationResult.quality_score >= 80 ? 'text-green-600' : 'text-orange-500'}`}>
                                {validationResult.quality_score}/100
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Clarity:</span>
                            <span className="ml-2 font-medium">{validationResult.clarity}</span>
                        </div>
                    </div>
                    {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                        <div>
                            <p className="font-medium text-gray-700 mb-1">Suggestions:</p>
                            <ul className="list-disc list-inside text-gray-600 text-sm">
                                {validationResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TranscriptViewer;
