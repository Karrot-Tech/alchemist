const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require("path");
const os = require('os');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { put } = require('@vercel/blob');
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ffmpegPath = require('ffmpeg-static');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

const promptService = require('../services/promptService');
const requireAuth = require('../middleware/auth');
const { loadPrompts } = require('../prompts/loader');

// Initialize Multer
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Helper for prompts
const PROMPTS = loadPrompts();
const getDefaultPrompt = (key) => PROMPTS.find(p => p.key === key)?.text || "";

// FFmpeg Helpers
const checkFFmpeg = async () => {
    return ffmpegPath;
};

const convertToMp3 = async (ffmpegPath, inputPath, outputPath) => {
    try {
        console.log(`[FFmpeg] Converting ${path.basename(inputPath)} -> ${path.basename(outputPath)} using ${ffmpegPath}`);
        await execPromise(`"${ffmpegPath}" -i "${inputPath}" -acodec libmp3lame -ab 128k -y "${outputPath}"`);
        return true;
    } catch (e) {
        console.error("FFmpeg Conversion Error:", e);
        return false;
    }
};

// POST /api/upload
router.post('/api/upload', requireAuth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

        console.log(`[Async] Processing upload: ${req.file.originalname}`);

        const originalExt = path.extname(req.file.originalname) || '';
        const tempPathOriginal = path.join(os.tmpdir(), `original-${Date.now()}${originalExt}`);
        await fs.promises.writeFile(tempPathOriginal, req.file.buffer);

        let finalPath = tempPathOriginal;
        let mimeType = req.file.mimetype;
        const isMp3 = mimeType === 'audio/mpeg' || mimeType === 'audio/mp3' || req.file.originalname.endsWith('.mp3');

        const sysFfmpegPath = await checkFFmpeg();
        let convertedPath = null;

        if (!isMp3) {
            console.log(`[Async] Non-MP3 detected (${mimeType}). Converting via ${sysFfmpegPath}...`);
            convertedPath = path.join(os.tmpdir(), `converted-${Date.now()}.mp3`);
            const success = await convertToMp3(sysFfmpegPath, tempPathOriginal, convertedPath);
            if (success) {
                finalPath = convertedPath;
                mimeType = "audio/mp3";
            } else {
                console.error("[Async] FFmpeg conversion failed. Using original file.");
            }
        }

        if (mimeType === 'application/octet-stream') {
            if (finalPath.endsWith('.mp3')) mimeType = "audio/mp3";
            else if (finalPath.endsWith('.mp4') || finalPath.endsWith('.m4a')) mimeType = "audio/mp4";
        }

        if (mimeType.startsWith('audio/x-m4a')) mimeType = mimeType.replace('audio/x-m4a', 'audio/mp4');

        if (mimeType.includes(';')) {
            console.log(`[Async] Stripping codec info: ${mimeType} -> ${mimeType.split(';')[0]}`);
            mimeType = mimeType.split(';')[0];
        }

        mimeType = mimeType || "audio/mp3";
        console.log(`[Async] Uploading to Gemini. Final Path: ${path.basename(finalPath)}, MIME: ${mimeType}`);

        const uploadResult = await fileManager.uploadFile(finalPath, {
            mimeType: mimeType,
            displayName: req.file.originalname,
        });

        let permanentAudioUrl = null;
        try {
            if (process.env.BLOB_READ_WRITE_TOKEN) {
                const blobFilename = `dictations/${Date.now()}-${path.basename(finalPath)}`;
                const blobBuffer = finalPath === convertedPath ? fs.readFileSync(convertedPath) : req.file.buffer;
                const blobResult = await put(blobFilename, blobBuffer, {
                    access: 'public',
                    contentType: mimeType,
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });
                permanentAudioUrl = blobResult.url;
            }
        } catch (blobErr) {
            console.error("Blob Save Error:", blobErr);
        }

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

// GET /api/status
router.get('/api/status', requireAuth, async (req, res) => {
    try {
        const name = req.query.name;
        if (!name) return res.status(400).json({ error: "Missing name parameter" });

        const file = await fileManager.getFile(name);
        res.json({
            name: file.name,
            state: file.state,
            mimeType: file.mimeType
        });
    } catch (error) {
        console.error("Status Check Error:", error);
        res.status(500).json({ error: "Failed to check status" });
    }
});

// POST /api/generate
router.post('/api/generate', requireAuth, async (req, res) => {
    try {
        const { file_uri, mime_type } = req.body;
        if (!file_uri) return res.status(400).json({ error: "No file URI provided" });

        let normalizedMime = mime_type || "audio/mp3";
        if (normalizedMime.startsWith('audio/x-m4a')) normalizedMime = "audio/mp4";
        if (normalizedMime.includes(';')) {
            normalizedMime = normalizedMime.split(';')[0];
        }

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
            message: error.message || "No error message provided by AI SDK"
        });
    }
});

// POST /validate (Legacy root path)
router.post('/validate', requireAuth, async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).json({ error: "No transcript provided" });

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

// POST /assess-soap (Legacy root path)
router.post('/assess-soap', requireAuth, async (req, res) => {
    try {
        const { transcript, additional_notes, template_id } = req.body;
        if (!transcript) return res.status(400).json({ error: "No transcript provided" });

        let schema;
        let promptTemplate;

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
            .replace(/\{\{notes\}\}/g, additional_notes || 'None')
            .replace(/\{\{doctor_notes\}\}/g, additional_notes || 'None')
            .replace(/\{\{transcript\}\}/g, transcript);

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

// POST /generate-document (Legacy root path)
router.post('/generate-document', requireAuth, async (req, res) => {
    try {
        const { data, template_id } = req.body;

        if (!data) return res.status(400).json({ error: "No data provided for generation" });

        let content;
        if (template_id) {
            const template = await promptService.getTemplate(template_id);
            if (!template) return res.status(404).json({ error: "Template not found" });

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
            // Fix path to template_soap.docx: it is in server root, so ../ from simple testing
            // But lets use path relative to this file to be safe.
            // server/routes/ai.js -> ../template_soap.docx = server/template_soap.docx
            const templatePath = path.resolve(__dirname, '../template_soap.docx');
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

module.exports = router;
