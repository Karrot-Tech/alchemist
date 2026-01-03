import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Square, Play, Pause, FileAudio, AlertCircle, X } from 'lucide-react';

const AudioUploader = ({ onTranscriptionComplete }) => {
    const [mode, setMode] = useState('upload'); // 'upload' | 'record'
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0); // 0-255 for visualizer
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
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
            setAudioBlob(null); // Clear recording if file selected
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
                const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
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

        setIsProcessing(true);
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
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                } catch (e) {
                    if (text) errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            onTranscriptionComplete(data.transcript);
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
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                            id="file-upload"
                            className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer block">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload size={24} />
                            </div>
                            <p className="text-slate-900 font-medium mb-1">{file ? file.name : "Click to upload or drag and drop"}</p>
                            <p className="text-xs text-slate-500">MP3, M4A, WAV, WebM (Max 50MB)</p>
                        </label>
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-xl p-8 text-center text-white relative overflow-hidden transition-all duration-500">

                        <div className="relative z-10 flex flex-col items-center justify-center min-h-[220px]">
                            {isRecording ? (
                                <>
                                    <div className="text-5xl font-mono font-bold tracking-wider mb-8 text-white relative">
                                        {formatTime(recordingTime)}
                                        {/* Visualizer Ring - Low Bloat */}
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-red-500/30 transition-all duration-75 ease-linear pointer-events-none"
                                            style={{
                                                width: `${140 + audioLevel}px`,
                                                height: `${140 + audioLevel}px`,
                                                opacity: Math.min(audioLevel / 50, 0.8)
                                            }}
                                        ></div>
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
                                            Recording...
                                        </p>
                                        {recordingTime < MIN_DURATION_SECONDS && (
                                            <p className="text-xs text-slate-500">Minimum duration: 2:00</p>
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
                                                ${isPreviewPlaying ? 'bg-red-500 hover:bg-red-600 shadow-red-900/50' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50'}`}
                                        >
                                            {isPreviewPlaying ? (
                                                <><Square size={18} fill="currentColor" /> Stop Preview</>
                                            ) : (
                                                <><Play size={18} fill="currentColor" /> Preview</>
                                            )}
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
                                ) : mode === 'record' ? 'Transcribe Recording' : 'Transcribe File'}
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
