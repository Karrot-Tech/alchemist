import React, { useState } from 'react';

const AudioUploader = ({ onTranscriptionComplete }) => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

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

        setIsUploading(true);
        setError('');
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
                    const text = await response.text();
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            onTranscriptionComplete(data.transcript);
            setFile(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsUploading(false);
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
                    disabled={isUploading}
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
                        disabled={isUploading}
                        className={`py-2 px-4 rounded-md text-white font-medium transition-colors
                    ${isUploading
                                ? 'bg-indigo-400 cursor-wait'
                                : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {isUploading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing Audio...
                            </span>
                        ) : 'Transcribe Audio'}
                    </button>
                )}

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
        </div>
    );
};

export default AudioUploader;
