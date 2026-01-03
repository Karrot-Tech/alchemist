const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const path = require("path");
const cors = require('cors');
const { put } = require('@vercel/blob');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const promptService = require('./services/promptService');
const { loadPrompts } = require('./prompts/loader');
const os = require('os');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const requireAuth = require('./middleware/auth');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PROMPTS = loadPrompts();

// Helper to get default prompt text
const getDefaultPrompt = (key) => PROMPTS.find(p => p.key === key)?.text || "";

const app = express();


// Global Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Too strict for dev/mixed content usually, enable carefully
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: process.env.CLIENT_URL || '*', // Best practice: restrict to client URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiter (AI Endpoints)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: { error: "Too many AI requests, please try again later." }
});
app.use(['/api/generate', '/api/upload', '/assess-soap', '/validate', '/api/templates/analyze'], aiLimiter);


// --- System Agents (Brains) Management ---
const SYSTEM_AGENTS = {
    'transcriber': { name: 'Transcriber Bot', file: 'transcribe_audio.md', desc: 'Converts raw audio to text.' },
    'auditor': { name: 'Quality Auditor', file: 'validate_transcript.md', desc: 'Checks transcript quality and completeness.' },
    'analyst': { name: 'Clinical Analyst', file: 'assess_soap.md', desc: 'Generates clinical assessments.' },
    'architect': { name: 'Template Architect', file: 'analyze_template.md', desc: 'Analyzes DOCX templates for structure.' }
};

app.get('/api/system-prompts', requireAuth, (req, res) => {
    res.json(Object.entries(SYSTEM_AGENTS).map(([key, val]) => ({ id: key, ...val })));
});

app.get('/api/system-prompts/:id', requireAuth, async (req, res) => {
    const agent = SYSTEM_AGENTS[req.params.id];
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    try {
        const content = await promptService.loadSystemPrompt(agent.file);
        res.json({ id: req.params.id, content });
    } catch (err) {
        res.status(500).json({ error: "Failed to load prompt" });
    }
});

app.put('/api/system-prompts/:id', requireAuth, async (req, res) => {
    const agent = SYSTEM_AGENTS[req.params.id];
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    try {
        const { content } = req.body;
        await promptService.saveSystemPrompt(agent.file, content);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to save prompt" });
    }
});

const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => res.send('pong')); // DEBUG ROUTE


// Middleware definitions


// --- Patient Management Routes (Protected) ---
app.get('/api/patients', requireAuth, async (req, res) => {
    try {
        const patients = await promptService.getAllPatients(req.auth.userId);
        res.json(patients);
    } catch (err) {
        res.status(500).json({ error: "Failed to load patients" });
    }
});

app.post('/api/patients', requireAuth, async (req, res) => {
    try {
        const { name, mrn, dob } = req.body;
        if (!name) return res.status(400).json({ error: "Patient name is required" });
        const newPatient = await promptService.createPatient(name, mrn, dob, req.auth.userId);
        res.json(newPatient);
    } catch (err) {
        res.status(500).json({ error: "Failed to create patient" });
    }
});

app.put('/api/patients/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mrn, dob } = req.body;
        if (!name) return res.status(400).json({ error: "Patient name is required" });

        const updated = await promptService.updatePatient(id, name, mrn, dob, req.auth.userId);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update patient" });
    }
});

// --- Transcript Management Routes (Protected) ---
app.post('/api/transcripts', requireAuth, async (req, res) => {
    try {
        const { patient_name, date, content, notes, patient_id, audio_url, assessment_text } = req.body;
        if (!patient_name || !date || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Clerk req.auth.userId
        const id = await promptService.saveTranscript(patient_name, date, content, notes, patient_id, req.auth.userId, audio_url, assessment_text);
        res.json({ success: true, id });
    } catch (error) {
        console.error("Save transcript error:", error);
        res.status(500).json({ error: "Failed to save transcript" });
    }
});

app.get('/api/transcripts', requireAuth, async (req, res) => {
    try {
        const list = await promptService.getAllTranscripts(req.auth.userId);
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transcripts" });
    }
});

app.get('/api/transcripts/:id', requireAuth, async (req, res) => {
    try {
        const item = await promptService.getTranscriptById(req.params.id, req.auth.userId);
        if (!item) return res.status(404).json({ error: "Transcript not found" });

        // Also fetch all linked assessments
        const assessments = await promptService.getAssessmentsForTranscript(req.params.id, req.auth.userId);
        res.json({ ...item, assessments });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transcript" });
    }
});

app.get('/api/transcripts/:id/assessments', requireAuth, async (req, res) => {
    try {
        const assessments = await promptService.getAssessmentsForTranscript(req.params.id, req.auth.userId);
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
});

app.post('/api/transcripts/:id/assessments', requireAuth, async (req, res) => {
    try {
        const { assessment_text, template_id } = req.body;
        // assessment_text is JSON content
        const id = await promptService.saveAssessment(req.params.id, template_id, assessment_text, req.auth.userId);

        // [COMPAT] Still update the legacy column for basic UI compatibility
        await promptService.updateTranscriptAssessment(req.params.id, JSON.stringify(assessment_text), req.auth.userId);

        res.json({ success: true, id });
    } catch (error) {
        console.error("Save assessment error:", error);
        res.status(500).json({ error: "Failed to save assessment" });
    }
});

app.put('/api/transcripts/:id/assessment', requireAuth, async (req, res) => {
    // Keep this for legacy / single-replace logic if needed
    try {
        const { assessment_text } = req.body;
        const result = await promptService.updateTranscriptAssessment(req.params.id, assessment_text, req.auth.userId);
        if (result.rowCount === 0) return res.status(404).json({ error: "Transcript not found" });
        res.json({ success: true });
    } catch (error) {
        console.error("Update assessment error:", error);
        res.status(500).json({ error: "Failed to update assessment" });
    }
});

// (Middleware moved to top)
// URLencoded moved up to global middleware block

// Multer Memory Storage (for Vercel/Serverless)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in .env");
}
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Help to check if ffmpeg is available
const checkFFmpeg = async () => {
    try {
        // Try simple command first
        await execPromise('ffmpeg -version');
        return "ffmpeg";
    } catch (e) {
        try {
            // Try common homebrew path on Apple Silicon
            const brewPath = "/opt/homebrew/bin/ffmpeg";
            await execPromise(`${brewPath} -version`);
            return brewPath;
        } catch (e2) {
            return false;
        }
    }
};

const convertToMp3 = async (ffmpegPath, inputPath, outputPath) => {
    try {
        console.log(`[FFmpeg] Converting ${path.basename(inputPath)} -> ${path.basename(outputPath)} using ${ffmpegPath}`);
        // -i: input, -acodec libmp3lame: use mp3 encoder, -ab 128k: constant bitrate, -y: overwrite
        await execPromise(`"${ffmpegPath}" -i "${inputPath}" -acodec libmp3lame -ab 128k -y "${outputPath}"`);
        return true;
    } catch (e) {
        console.error("FFmpeg Conversion Error:", e);
        return false;
    }
};

// Basic Health Check (Public)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Alchemist Server is running' });
});


// ---------------------------------------------------------
// Async Endpoint A: Upload (Protected)
// ---------------------------------------------------------
app.post('/api/upload', requireAuth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

        console.log(`[Async] Processing upload: ${req.file.originalname}`);

        // 1. Write original to temp file
        const originalExt = path.extname(req.file.originalname) || '';
        const tempPathOriginal = path.join(os.tmpdir(), `original-${Date.now()}${originalExt}`);
        fs.writeFileSync(tempPathOriginal, req.file.buffer);

        let finalPath = tempPathOriginal;
        let mimeType = req.file.mimetype;
        const isMp3 = mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' || req.file.originalname.endsWith('.mp3');

        // 2. Normalize to MP3 via FFmpeg if necessary
        const ffmpegPath = await checkFFmpeg();
        let convertedPath = null;

        if (!isMp3 && ffmpegPath) {
            console.log(`[Async] Non-MP3 detected (${mimeType}). Converting via ${ffmpegPath}...`);
            convertedPath = path.join(os.tmpdir(), `converted-${Date.now()}.mp3`);
            const success = await convertToMp3(ffmpegPath, tempPathOriginal, convertedPath);
            if (success) {
                finalPath = convertedPath;
                mimeType = "audio/mp3";
            } else {
                console.error("[Async] FFmpeg conversion failed. Using original file.");
            }
        } else if (!isMp3 && !ffmpegPath) {
            console.warn("[Async] FFmpeg not found. Falling back to direct upload.");
        }

        // Final sanity check for common extensions
        if (mimeType === 'application/octet-stream') {
            if (finalPath.endsWith('.mp3')) mimeType = "audio/mp3";
            else if (finalPath.endsWith('.mp4') || finalPath.endsWith('.m4a')) mimeType = "audio/mp4";
        }

        // Normalize x-m4a to mp4 but keep any codec strings for mp4
        if (mimeType.startsWith('audio/x-m4a')) mimeType = mimeType.replace('audio/x-m4a', 'audio/mp4');

        mimeType = mimeType || "audio/mp3";
        console.log(`[Async] Uploading to Gemini. Final Path: ${path.basename(finalPath)}, MIME: ${mimeType}`);

        // 3. Upload to Gemini
        const uploadResult = await fileManager.uploadFile(finalPath, {
            mimeType: mimeType,
            displayName: req.file.originalname,
        });

        // 4. Store permanent backup (Vercel Blob)
        let permanentAudioUrl = null;
        try {
            if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blobFilename = `dictations/${Date.now()}-${path.basename(finalPath)}`;
                const blobBuffer = finalPath === convertedPath ? fs.readFileSync(convertedPath) : req.file.buffer;
                const blobResult = await put(blobFilename, blobBuffer, {
                    access: 'public',
                    contentType: mimeType
                });
                permanentAudioUrl = blobResult.url;
            }
        } catch (blobErr) {
            console.error("Blob Save Error:", blobErr);
        }

        // Cleanup
        if (fs.existsSync(tempPathOriginal)) fs.unlinkSync(tempPathOriginal);
        if (convertedPath && fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);

        res.json({
            gemini_file_name: uploadResult.file.name,
            gemini_file_uri: uploadResult.file.uri,
            audio_url: permanentAudioUrl,
            mime_type: mimeType
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// Async Endpoint B: Check Status (Protected)
// ---------------------------------------------------------
app.get('/api/status', requireAuth, async (req, res) => {
    try {
        const name = req.query.name;
        if (!name) return res.status(400).json({ error: "Missing name parameter" });

        const file = await fileManager.getFile(name);
        res.json({
            name: file.name,
            state: file.state,
            mimeType: file.mimeType // Return the actual detected mimeType from Gemini
        });
    } catch (error) {
        console.error("Status Check Error:", error);
        res.status(500).json({ error: "Failed to check status" });
    }
});

// ---------------------------------------------------------
// Async Endpoint C: Generate (Protected)
// ---------------------------------------------------------
app.post('/api/generate', requireAuth, async (req, res) => {
    try {
        const { file_uri, mime_type } = req.body;
        if (!file_uri) return res.status(400).json({ error: "No file URI provided" });

        // Use the mime_type passed from client (which should match what we uploaded)
        let normalizedMime = mime_type;
        if (normalizedMime === 'audio/x-m4a') normalizedMime = "audio/mp4";
        normalizedMime = normalizedMime || "audio/mp3";

        console.log(`[Async] Generating transcript for URI: ${file_uri}, MIME: ${normalizedMime}`);

        const modelName = process.env.GEMINI_MODEL_TRANSCRIBE || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        const defaultTranscribeText = getDefaultPrompt('transcribe_audio');
        const promptText = await promptService.get('transcribe_audio', defaultTranscribeText);

        const result = await model.generateContent([
            promptText,
            {
                fileData: {
                    fileUri: file_uri,
                    mimeType: normalizedMime,
                },
            },
        ]);

        const transcriptText = result.response.text();
        res.json({ transcript: transcriptText });

    } catch (error) {
        console.error("Generate Error Detailed:", error);
        res.status(500).json({
            error: "Transcript generation failed",
            message: error.message || "No error message provided by AI SDK",
            details: error.toString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Legacy Wrapper (Attempts to use Async flow internally or just fails for large files)
// Kept for backward compat if client isn't updated immediately, but effectively deprecated
app.post('/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
    return res.status(400).json({ error: "This endpoint is deprecated. Please refresh the page to use the new Async Uploader." });
});


// ---------------------------------------------------------
// Endpoint B: Validation (Protected)
// ---------------------------------------------------------
app.post('/validate', requireAuth, async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).json({ error: "No transcript provided" });

        // Define the output schema
        const schema = {
            description: "Quality assessment of the transcript",
            type: SchemaType.OBJECT,
            properties: {
                quality_score: { type: SchemaType.NUMBER, description: "Score from 0-100" },
                clarity: { type: SchemaType.STRING, description: "High, Medium, or Low" },
                suggestions: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                }
            },
            required: ["quality_score", "clarity", "suggestions"]
        };

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL_VALIDATE || "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const defaultValidateText = getDefaultPrompt('validate_transcript');
        let promptText = await promptService.get('validate_transcript', defaultValidateText);
        promptText = promptText.replace('{{transcript}}', transcript);
        const result = await model.generateContent(promptText);

        res.json(JSON.parse(result.response.text()));

    } catch (error) {
        console.error("Validation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// Endpoint C: SOAP Assessment (Protected)
// ---------------------------------------------------------
app.post('/assess-soap', requireAuth, async (req, res) => {
    try {
        const { transcript, additional_notes, template_id } = req.body;
        if (!transcript) return res.status(400).json({ error: "No transcript provided" });

        let schema;
        let promptTemplate;

        // 1. Determine Schema & Prompt Strategy
        if (template_id) {
            const template = await promptService.getTemplate(template_id);
            if (!template) return res.status(404).json({ error: "Template not found" });

            try {
                schema = JSON.parse(template.schema_json);
            } catch (e) {
                return res.status(500).json({ error: "Corrupt Template Schema" });
            }
            promptTemplate = template.prompt_text;
        } else {
            // Default SOAP Schema
            schema = {
                description: "Psychiatric SOAP Note content",
                type: SchemaType.OBJECT,
                properties: {
                    patient_name: { type: SchemaType.STRING, description: "Name of the patient if mentioned, else 'Patient'" },
                    subjective: { type: SchemaType.STRING, description: "Patient's reported symptoms, history, and quotes." },
                    objective: { type: SchemaType.STRING, description: "Observed behavior, mental status exam findings." },
                    assessment: { type: SchemaType.STRING, description: "Diagnosis, clinical impression, and synthesis." },
                    plan: { type: SchemaType.STRING, description: "Treatment plan, next steps, referrals." },
                    medications: { type: SchemaType.STRING, description: "Current or newly prescribed medications." },
                },
                required: ["subjective", "objective", "assessment", "plan"]
            };

            const defaultSoapText = getDefaultPrompt('assess_soap');
            promptTemplate = await promptService.get('assess_soap', defaultSoapText);
        }

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL_ASSESS || "gemini-2.5-pro",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const prompt = promptTemplate
            .replace(/\{\{notes\}\}/g, additional_notes || 'None')       // Default Prompt key
            .replace(/\{\{doctor_notes\}\}/g, additional_notes || 'None') // Custom Template key (Strict)
            .replace(/\{\{transcript\}\}/g, transcript);                 // Transcript

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const json = JSON.parse(text);
            res.json(json);
        } catch (parseError) {
            res.status(500).json({ error: "Failed to parse AI response as JSON", raw_text: text });
        }

    } catch (error) {
        res.status(500).json({ error: error.message || "Unknown Error" });
    }
});

// ---------------------------------------------------------
// Endpoint: Template Management (Protected)
// ---------------------------------------------------------

// GET /api/templates
app.get('/api/templates', requireAuth, async (req, res) => {
    try {
        const templates = await promptService.getAllTemplates(req.auth.userId);
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/templates - Create New (Owner = userId)
// POST /api/templates - Create New (Owner = userId)
app.post('/api/templates', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { name, description, prompt_text, schema_json } = req.body;
        // In multipart/form-data, req.body fields arrive as strings
        if (!name || !req.file || !prompt_text || !schema_json) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error("CRITICAL: BLOB_READ_WRITE_TOKEN is missing in environment variables.");
            return res.status(500).json({
                error: "Configuration Error",
                message: "Server is missing BLOB_READ_WRITE_TOKEN. Please add it to Vercel Environment Variables."
            });
        }

        // Upload to Vercel Blob
        // Parse schema_json string if needed
        let schemaObj = schema_json;
        if (typeof schema_json === 'string') {
            try { schemaObj = JSON.parse(schema_json); } catch (e) {
                console.warn("Schema parse warning:", e.message);
            }
        }

        console.log("[DEBUG] Uploading file to Vercel Blob...");
        const blob = await put(req.file.originalname, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: true
        });
        console.log("[DEBUG] Blob uploaded successfully:", blob.url);

        console.log("[DEBUG] Saving template to database...");
        const id = await promptService.createTemplate(name, description, blob.url, prompt_text, schemaObj, req.auth.userId);
        console.log("[DEBUG] Template saved to DB with ID:", id);

        res.json({ success: true, id });
    } catch (err) {
        console.error("Create Template CRITICAL FAILURE:", err);
        // Return actual error context to help debugging
        res.status(500).json({
            error: "Template Creation Failed",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Update Template
app.put('/api/templates/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, prompt_text, schema_json } = req.body;

        await promptService.updateTemplate(id, name, description, prompt_text, JSON.parse(schema_json), req.auth.userId);
        res.json({ success: true });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ error: "Failed to update template" });
    }
});

app.delete('/api/templates/:id', requireAuth, async (req, res) => {
    try {
        const result = await promptService.deleteTemplate(req.params.id, req.auth.userId);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Template not found or unauthorized" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Template Error:", err);
        res.status(500).json({ error: "Failed to delete template" });
    }
});

// POST /api/templates/analyze (Protected)
app.post('/api/templates/analyze', requireAuth, upload.single('template'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No template file uploaded" });

        console.log(`Analyzing template: ${req.file.originalname}`);

        // 1. Extract Placeholders from Buffer
        const zip = new PizZip(req.file.buffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const fullText = doc.getFullText();
        const placeholderRegex = /\{{1,2}\s*([\w\s]+?)\s*\}{1,2}/g;

        const matches = new Set();
        let match;

        while ((match = placeholderRegex.exec(fullText)) !== null) {
            matches.add(match[1].trim());
        }

        const docXml = zip.file("word/document.xml").asText();
        while ((match = placeholderRegex.exec(docXml)) !== null) {
            matches.add(match[1].trim());
        }

        const placeholders = Array.from(matches).filter(p => p && p.trim().length > 0);

        if (placeholders.length === 0) {
            return res.json({
                placeholders: [],
                schema_suggestion: {},
                prompt_suggestion: ""
            });
        }

        // 2. Ask Gemini to generate Schema & Prompt
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const defaultAnalyzeText = getDefaultPrompt('analyze_template');
        const rawPrompt = await promptService.get('analyze_template', defaultAnalyzeText);
        const analysisPrompt = rawPrompt.replace('{{placeholders}}', JSON.stringify(placeholders));

        const result = await model.generateContent(analysisPrompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const analysisResult = JSON.parse(text);

        res.json({
            placeholders,
            file_path: "PENDING_UPLOAD", // Client will upload in next step if using this flow, or this is just for preview
            schema_suggestion: analysisResult.schema || {},
            prompt_suggestion: analysisResult.prompt_text || ""
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: "Analysis failed", details: error.message });
    }
});

// POST /api/templates/refresh (Protected)
app.post('/api/templates/refresh', requireAuth, async (req, res) => {
    try {
        const { template_id } = req.body;
        const template = await promptService.getTemplate(template_id);

        if (!template || !template.file_path) {
            return res.status(404).json({ error: "Template file not found" });
        }

        // TODO: ideally check ownership if private template
        const filePath = template.file_path;

        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        const fullText = doc.getFullText();

        const placeholderRegex = /\{{1,2}\s*([\w\s]+?)\s*\}{1,2}/g;
        const matches = new Set();
        let match;
        while ((match = placeholderRegex.exec(fullText)) !== null) {
            matches.add(match[1].trim());
        }

        const docXml = zip.file("word/document.xml").asText();
        while ((match = placeholderRegex.exec(docXml)) !== null) {
            matches.add(match[1].trim());
        }

        const placeholders = Array.from(matches).filter(p => p && p.trim().length > 0);

        if (placeholders.length === 0) {
            return res.json({ placeholders: [], schema_suggestion: {}, prompt_suggestion: "" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const defaultAnalyzeText = getDefaultPrompt('analyze_template');
        const rawPrompt = await promptService.get('analyze_template', defaultAnalyzeText);
        const analysisPrompt = rawPrompt.replace('{{placeholders}}', JSON.stringify(placeholders));

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const analysisResult = JSON.parse(responseText);

        res.json({
            placeholders,
            schema_suggestion: analysisResult.schema || {},
            prompt_suggestion: analysisResult.prompt_text || ""
        });

    } catch (error) {
        console.error("Refresh Error:", error);
        res.status(500).json({ error: "Refresh failed" });
    }
});

// ---------------------------------------------------------
// Endpoint D: Final Document Generation (Protected)
// ---------------------------------------------------------
app.post('/generate-document', requireAuth, async (req, res) => {
    try {
        const { data, template_id } = req.body;

        if (!data) return res.status(400).json({ error: "No data provided for generation" });

        let content;
        if (template_id) {
            const template = await promptService.getTemplate(template_id);
            if (!template) return res.status(404).json({ error: "Template not found" });

            // Fetch from Blob URL if it's a URL, otherwise fallback to local (for legacy/dev)
            if (template.file_path && template.file_path.startsWith('http')) {
                const response = await fetch(template.file_path);
                if (!response.ok) throw new Error(`Failed to fetch template from ${template.file_path}`);
                const arrayBuffer = await response.arrayBuffer();
                content = Buffer.from(arrayBuffer);
            } else {
                if (!fs.existsSync(template.file_path)) {
                    return res.status(500).json({ error: `Template file missing at ${template.file_path}` });
                }
                content = fs.readFileSync(template.file_path, 'binary');
            }
        } else {
            const templatePath = path.resolve(__dirname, 'template_soap.docx');
            if (!fs.existsSync(templatePath)) return res.status(500).json({ error: "Default SOAP Template missing." });
            content = fs.readFileSync(templatePath, 'binary');
        }

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => "N/A"
        });

        doc.render(data);

        const buf = doc.getZip().generate({ type: "nodebuffer" });

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=${(data.patient_name || 'Assessment').replace(/ /g, '_')}_${template_id || 'soap'}.docx`
        });

        res.send(buf);

    } catch (error) {
        console.error("Doc Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// ---------------------------------------------------------
// Endpoint E: Dashboard Stats (Protected)
// ---------------------------------------------------------
// ---------------------------------------------------------
// Endpoint E: Dashboard Stats (Protected)
// ---------------------------------------------------------
app.get('/api/dashboard', requireAuth, async (req, res) => {
    console.log("Dashboard Endpoint Hit. User:", req.auth.userId);
    try {
        console.log("Fetching patients and transcripts...");
        const [patients, transcripts, templates] = await Promise.all([
            promptService.getAllPatients(req.auth.userId),
            promptService.getAllTranscripts(req.auth.userId),
            promptService.getAllTemplates(req.auth.userId)
        ]);
        console.log(`Fetched ${patients.length} patients, ${transcripts.length} transcripts, ${templates.length} templates`);

        const recentActivity = transcripts.slice(0, 5).map(t => ({
            id: t.id,
            patient: t.patient_name,
            date: t.date,
            created_at: t.created_at,
            summary: t.content ? t.content.substring(0, 100) + '...' : 'No content',
            type: 'session'
        }));

        // Calculate simplified stats
        const drafts = transcripts.filter(t => !t.patient_id || t.patient_name === 'Draft Patient');

        const stats = {
            total_patients: patients.length,
            total_drafts: drafts.length,
            total_records: transcripts.length - drafts.length,
            total_templates: templates.length,
            total_sessions: transcripts.length
        };

        res.json({ stats, recentActivity });
    } catch (error) {
        console.error("Dashboard Error Detailed:", error);
        res.status(500).json({ error: "Failed to load dashboard", details: error.message });
    }
});

// Serve static React files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start Server

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server & Client running on port ${PORT}`);
    });
}

module.exports = app;

