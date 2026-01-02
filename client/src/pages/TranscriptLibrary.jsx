import React, { useState, useEffect } from 'react';

function TranscriptLibrary({ onSelectTranscript }) {
    const [transcripts, setTranscripts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/transcripts')
            .then(res => res.json())
            .then(data => {
                setTranscripts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load library", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-10 text-center">Loading Library...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Patient Records</h2>

            {transcripts.length === 0 ? (
                <div className="text-center p-10 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                    No saved transcripts found. Start a new session to create one.
                </div>
            ) : (
                <div className="grid gap-4">
                    {transcripts.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800">{t.patient_name}</h3>
                                <p className="text-sm text-gray-500">Date: {t.date} • ID: {t.id}</p>
                            </div>
                            <button
                                onClick={() => onSelectTranscript(t)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                            >
                                Open File
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TranscriptLibrary;
