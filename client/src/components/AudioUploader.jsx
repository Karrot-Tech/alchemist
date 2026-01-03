import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Square, Play, Pause, FileAudio, AlertCircle, X, Download, Sparkles } from 'lucide-react';

const AudioUploader = ({ onTranscriptionComplete, onUploadStart }) => {
    const [mode, setMode] = useState('upload'); // 'upload' | 'record'
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0]); // Frequency spectrum
    const [audioLevel, setAudioLevel] = useState(0); // Average for ring logic
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const animationFrameRef = useRef(null);

    const MIN_DURATION_SECONDS = 120; // 2 minutes

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
            setAudioBlob(null); // Clear recording if file selected
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            const droppedFile = droppedFiles[0];
            if (droppedFile.type.startsWith('audio/')) {
                setFile(droppedFile);
                setError('');
                setAudioBlob(null);
            } else {
                setError('Please drop a valid audio file.');
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            // Audio Visualizer Setup
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 32;
            source.connect(analyserRef.current);
            dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateVisualizer = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);

                // Extract 8 specific bins for frequencies (Low -> High)
                const bins = [0, 1, 2, 4, 6, 8, 10, 12].map(idx => dataArrayRef.current[idx] || 0);
                setAudioLevels(bins);

                // Also keep track of average for the pulsing background
                const average = bins.reduce((a, b) => a + b, 0) / bins.length;
                setAudioLevel(average);

                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const recordedFile = new File([blob], "recording.webm", { type: 'audio/webm' });
                setFile(recordedFile);

                stream.getTracks().forEach(track => track.stop());
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                if (audioContextRef.current) audioContextRef.current.close();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setError('');

            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error(err);
            setError("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const resetRecording = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setAudioBlob(null);
        setFile(null);
        setRecordingTime(0);
        setAudioLevel(0);
        setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0]);
        setIsPreviewPlaying(false);
        setError('');
    };

    const togglePreview = () => {
        if (isPreviewPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setIsPreviewPlaying(false);
        } else {
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audioRef.current = audio;
            audio.onended = () => setIsPreviewPlaying(false);
            audio.play();
            setIsPreviewPlaying(true);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDownloadRecording = () => {
        if (!audioBlob) return;
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording_${new Date().toISOString().split('T')[0]}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file or record audio first.');
            return;
        }

        // Stop preview if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsPreviewPlaying(false);
        }

        if (onUploadStart) {
            setIsProcessing(true);
            try {
                // Delegate to parent (Context approach)
                await onUploadStart(file);
                // Keep isProcessing=true to show "Transcribing..."/Greyed out
                // or we could change the label if we want, but this satisfies "grey out and show spinner"
            } catch (err) {
                console.error(err);
                setError(err.message);
                setIsProcessing(false);
            }
            return;
        }

        setIsProcessing(true);
        setError('');
        const formData = new FormData();
        formData.append('audio', file);

        try {
            // Step 1: Upload to Gemini (via Server)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) {
                const text = await uploadRes.text();
                throw new Error("Upload failed: " + text);
            }
            const { gemini_file_name, gemini_file_uri, audioUrl } = await uploadRes.json();

            // Step 2: Poll for Processing Status
            let state = "PROCESSING";
            while (state === "PROCESSING") {
                // Wait 2s
                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusRes = await fetch(`/api/status?name=${encodeURIComponent(gemini_file_name)}`);
                if (!statusRes.ok) throw new Error("Failed to check processing status");
                const statusData = await statusRes.json();
                state = statusData.state;

                if (state === "FAILED") throw new Error("Audio processing failed by AI provider.");
            }

            // Step 3: Generate Transcript
            const genRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_uri: gemini_file_uri,
                    mime_type: file.type || "audio/mp3" // Default to mp3 if blob type missing
                })
            });

            if (!genRes.ok) throw new Error("Transcript generation failed");
            const genData = await genRes.json();

            onTranscriptionComplete({
                transcript: genData.transcript,
                audioUrl: audioUrl
            });
            setFile(null);
            setAudioBlob(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    // Helper: is Duration valid?
    const isDurationValid = mode === 'record' ? recordingTime >= MIN_DURATION_SECONDS : true;

    return (
        <div className="md:p-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <FileAudio className="text-indigo-600" />
                1. Capture Audio
            </h2>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => { setMode('upload'); resetRecording(); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Upload size={16} /> Upload File
                </button>
                <button
                    onClick={() => { setMode('record'); setFile(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mode === 'record' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Mic size={16} /> Record Dictation
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {mode === 'upload' ? (
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging
                            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                            : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".mp3,audio/mpeg,.m4a,audio/x-m4a,.wav,audio/wav,.webm,audio/webm,audio/*"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                            id="file-upload"
                            className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${isDragging ? 'bg-indigo-600 text-white scale-110' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                <Upload size={24} />
                            </div>
                            <p className="text-slate-900 font-bold mb-1">
                                {file ? file.name : (isDragging ? "Drop your file here" : "Click to upload or drag and drop")}
                            </p>
                            <p className="text-xs text-slate-500">MP3, M4A, WAV, WebM (Max 50MB)</p>
                        </label>
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-xl p-8 text-center text-white relative overflow-hidden transition-all duration-500">

                        <div className="relative z-10 flex flex-col items-center justify-center min-h-[220px]">
                            {isRecording ? (
                                <>
                                    <div className="text-5xl font-mono font-bold tracking-wider mb-2 text-white relative z-20">
                                        {formatTime(recordingTime)}
                                        {/* Visualizer Ring - Glow Effect */}
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-indigo-500/20 transition-all duration-75 ease-linear pointer-events-none"
                                            style={{
                                                width: `${160 + audioLevel}px`,
                                                height: `${160 + audioLevel}px`,
                                                opacity: Math.min(audioLevel / 40, 0.6)
                                            }}
                                        ></div>
                                    </div>

                                    {/* Frequency Bars (Tone Feedback) */}
                                    <div className="flex items-end gap-1 h-12 mb-8 z-20">
                                        {audioLevels.map((lvl, i) => (
                                            <div
                                                key={i}
                                                className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75 ease-linear"
                                                style={{ height: `${Math.max(4, lvl / 2.5)}px`, opacity: 0.3 + (lvl / 255) }}
                                            ></div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={stopRecording}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 transition-all hover:scale-105 z-20"
                                    >
                                        <Square fill="white" size={24} />
                                    </button>
                                    <div className="mt-4 flex flex-col items-center gap-1">
                                        <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                            Recording Live
                                        </p>
                                        {recordingTime < MIN_DURATION_SECONDS && (
                                            <p className="text-xs text-slate-500 font-mono">2:00 MIN REQ — {formatTime(recordingTime)}</p>
                                        )}
                                    </div>
                                </>
                            ) : audioBlob ? (
                                <>
                                    <div className="mb-6 flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                                        <CheckCircle className="text-emerald-400" size={16} />
                                        <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={resetRecording}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all border border-slate-700 text-slate-300"
                                        >
                                            <X size={18} /> Retake
                                        </button>
                                        <button
                                            onClick={togglePreview}
                                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-white shadow-lg 
                                                ${isPreviewPlaying ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50' : 'bg-indigo-600 hover:bg-indigo-50 shadow-indigo-900/50'}`}
                                        >
                                            {isPreviewPlaying ? (
                                                <><Square size={18} fill="currentColor" /> Stop Preview</>
                                            ) : (
                                                <><Play size={18} fill="currentColor" /> Preview</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleDownloadRecording}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all border border-slate-700 text-slate-300"
                                            title="Download Recording"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </div>
                                    {!isDurationValid && (
                                        <div className="mt-6 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                            <AlertCircle size={14} />
                                            <span>Recording too short. Must be at least 2 minutes.</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/50 animate-bounce-slow hover:scale-110 transition-transform cursor-pointer" onClick={startRecording}>
                                        <Mic size={32} />
                                    </div>
                                    <button
                                        onClick={startRecording}
                                        className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all"
                                    >
                                        Start Recording
                                    </button>
                                    <p className="mt-4 text-xs text-slate-500">Requires microphone access</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Processing & Actions */}
                {file && !isRecording && (
                    <div className="animate-fade-in mt-4">
                        {!isDurationValid && mode === 'record' ? (
                            null
                        ) : (
                            <button
                                onClick={handleUpload}
                                disabled={isProcessing}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center gap-3
                                ${isProcessing
                                        ? 'bg-slate-400 cursor-wait'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200'}`}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Transcribing...
                                    </>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Sparkles size={20} />
                                        {mode === 'record' ? 'Transcribe Recording' : 'Transcribe File'}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm animate-shake">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
// Add CheckCircle icon locally if not imported
const CheckCircle = ({ size, className }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;

export default AudioUploader;
