import React, { useState } from 'react';

const AudioUploader = ({ onTranscriptionComplete, isLoading }) => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('audio', file);

        try {
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = 'Upload failed';
                try {
                    const err = await response.json();
                    errorMessage = err.error || errorMessage;
                } catch (e) {
                    // If JSON parse fails, try text
                    const text = await response.text();
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            onTranscriptionComplete(data.transcript);
            setFile(null); // Reset file input
        } catch (err) {
            console.error(err);
            setError(err.message);
            // onTranscriptionComplete(null, err.message); // Don't crash parent on error
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Upload Audio</h2>

            <div className="flex flex-col gap-4">
                <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                />

                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={isLoading}
                        className={`py-2 px-4 rounded-md text-white font-medium transition-colors
                    ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isLoading ? 'Processing...' : 'Transcribe Audio'}
                    </button>
                )}

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
        </div>
    );
};

export default AudioUploader;
