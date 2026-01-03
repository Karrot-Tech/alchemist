const express = require('express');
const router = express.Router();
const multer = require('multer');
const { put } = require('@vercel/blob');
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require("path");
const { z } = require('zod');
const promptService = require('../services/promptService');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loadPrompts } = require('../prompts/loader');

// Initialize Multer
const upload = multer({ storage: multer.memoryStorage() });

// Schemas
// Note: In multipart/form-data, all non-file fields are strings.
const createTemplateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    prompt_text: z.string().min(1, "Prompt text is required"),
    schema_json: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, "Invalid JSON schema")
});

const updateTemplateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    prompt_text: z.string().optional(),
    schema_json: z.string().optional().refine((val) => {
        if (!val) return true;
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, "Invalid JSON schema")
});

// Initialize Gemini (We need to re-init here or export a shared instance. Re-init is safer/easier for now)
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Helper for prompts (Copied from server.js logic)
const PROMPTS = loadPrompts();
const getDefaultPrompt = (key) => PROMPTS.find(p => p.key === key)?.text || "";

// GET /api/templates
router.get('/', requireAuth, async (req, res) => {
    try {
        const templates = await promptService.getAllTemplates(req.auth.userId);
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/templates - Create New
// Multer must run before validation to parse body
router.post('/', requireAuth, upload.single('file'), validate(createTemplateSchema), async (req, res) => {
    try {
        const { name, description, prompt_text, schema_json } = req.body;
        // Zod validated fields, but we handle file check manually
        if (!req.file) {
            return res.status(400).json({ error: "Missing template file" });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error("CRITICAL: BLOB_READ_WRITE_TOKEN is missing.");
            return res.status(500).json({ error: "Configuration Error", message: "Server is missing BLOB_READ_WRITE_TOKEN." });
        }

        let schemaObj = JSON.parse(schema_json); // Safe due to Zod

        const blob = await put(req.file.originalname, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: true
        });

        const id = await promptService.createTemplate(name, description, blob.url, prompt_text, schemaObj, req.auth.userId);
        res.json({ success: true, id });
    } catch (err) {
        console.error("Create Template CRITICAL FAILURE:", err);
        res.status(500).json({ error: "Template Creation Failed", message: err.message });
    }
});

// PUT /api/templates/:id
router.put('/:id', requireAuth, validate(updateTemplateSchema), async (req, res) => {
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

// DELETE /api/templates/:id
router.delete('/:id', requireAuth, async (req, res) => {
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

// POST /api/templates/analyze
router.post('/analyze', requireAuth, upload.single('template'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No template file uploaded" });

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
            return res.json({ placeholders: [], schema_suggestion: {}, prompt_suggestion: "" });
        }

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
            file_path: "PENDING_UPLOAD",
            schema_suggestion: analysisResult.schema || {},
            prompt_suggestion: analysisResult.prompt_text || ""
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: "Analysis failed", details: error.message });
    }
});

// POST /api/templates/refresh
router.post('/refresh', requireAuth, async (req, res) => {
    try {
        const { template_id } = req.body;
        const template = await promptService.getTemplate(template_id);

        if (!template || !template.file_path) {
            return res.status(404).json({ error: "Template file not found" });
        }

        // Fetch if it's a URL (Blob storage)
        let content;
        if (template.file_path.startsWith('http')) {
            const response = await fetch(template.file_path);
            if (!response.ok) throw new Error(`Failed to fetch template from ${template.file_path}`);
            const arrayBuffer = await response.arrayBuffer();
            content = Buffer.from(arrayBuffer);
        } else {
            // Fallback for local
            content = fs.readFileSync(template.file_path, 'binary');
        }

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

module.exports = router;
