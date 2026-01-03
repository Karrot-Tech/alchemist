import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const TranscriptionContext = createContext();

export const useTranscription = () => useContext(TranscriptionContext);

export const TranscriptionProvider = ({ children }) => {
    // jobs: { [id]: { status, date, patientName, fileName, error } }
    const [jobs, setJobs] = useState({});

    const addJob = (id, data) => {
        setJobs(prev => ({ ...prev, [id]: { ...data, status: 'uploading' } }));
    };

    const updateJobStatus = (id, status, result = null, error = null) => {
        setJobs(prev => {
            const current = prev[id];
            if (!current) return prev;
            return {
                ...prev,
                [id]: { ...current, status, result, error }
            };
        });
    };

    const uploadAndTranscribe = useCallback(async (file, metadata) => {
        const jobId = Date.now().toString();
        const { patientName, patientId, date, doctorNotes } = metadata;

        addJob(jobId, {
            date: new Date().toISOString(),
            patientName: patientName || "Unassigned",
            fileName: file.name
        });

        const formData = new FormData();
        formData.append('audio', file);

        try {
            // 1. Transcribe
            // 1. Upload to Gemini
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) {
                const text = await uploadRes.text();
                throw new Error("Upload failed: " + text);
            }
            const { gemini_file_name, gemini_file_uri, audio_url, mime_type: gemini_mime_type } = await uploadRes.json();

            // 2. Poll for Processing Status
            let state = "PROCESSING";
            let verifiedMime = gemini_mime_type;

            while (state === "PROCESSING") {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusRes = await fetch(`/api/status?name=${encodeURIComponent(gemini_file_name)}`);
                if (!statusRes.ok) throw new Error("Failed to check processing status");
                const statusData = await statusRes.json();
                state = statusData.state;
                if (statusData.mimeType) verifiedMime = statusData.mimeType;

                if (state === "FAILED") throw new Error("Audio processing failed by AI provider.");
            }

            // 3. Generate Transcript
            const genRes = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_uri: gemini_file_uri,
                    mime_type: verifiedMime || file.type || "audio/mp3"
                })
            });

            if (!genRes.ok) throw new Error("Transcript generation failed");
            const transData = await genRes.json();
            transData.audio_url = audio_url; // Merge back audio_url for saving

            // 2. Auto-Save to DB
            const saveRes = await fetch('/api/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: patientName || "Draft Patient",
                    patient_id: patientId,
                    date: date || new Date().toISOString().split('T')[0],
                    content: transData.transcript,
                    notes: doctorNotes || "",
                    audio_url: transData.audio_url,
                    assessment_text: null
                })
            });

            const savedRecord = await saveRes.json();
            if (!savedRecord.success && !savedRecord.id) throw new Error("Saved record invalid");

            updateJobStatus(jobId, 'completed', transData);
            toast.success(`Transcription ready for ${patientName || "new patient"}`);

        } catch (err) {
            console.error("Background job failed", err);
            updateJobStatus(jobId, 'error', null, err.message);
            toast.error(`Transcription failed: ${err.message}`);
        }

        return jobId;
    }, []);

    return (
        <TranscriptionContext.Provider value={{ jobs, uploadAndTranscribe }}>
            {children}
            {/* Optional: Floating Progress Widget could go here */}
        </TranscriptionContext.Provider>
    );
};
