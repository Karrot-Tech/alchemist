const express = require('express');
const router = express.Router();
const { z } = require('zod');
const promptService = require('../services/promptService');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Schemas
const saveTranscriptSchema = z.object({
    patient_name: z.string().min(1, "Patient name is required"),
    date: z.string().min(1, "Date is required"),
    content: z.string().min(1, "Content is required"),
    notes: z.string().optional(),
    patient_id: z.number().nullable().optional(), // Can be null or number
    audio_url: z.string().url().optional().or(z.literal('')), // URL or empty string
    assessment_text: z.any().optional() // JSON content for assessment, flexible
});

const saveAssessmentSchema = z.object({
    assessment_text: z.record(z.any()).or(z.array(z.any())), // Expecting JSON object/array
    template_id: z.string().optional()
});

const updateAssessmentSchema = z.object({
    assessment_text: z.any() // Legacy endpoint might send string or object
});

// POST /api/transcripts
router.post('/', requireAuth, validate(saveTranscriptSchema), async (req, res) => {
    try {
        const { patient_name, date, content, notes, patient_id, audio_url, assessment_text } = req.body;
        // Validation handled
        const id = await promptService.saveTranscript(patient_name, date, content, notes, patient_id, req.auth.userId, audio_url, assessment_text);
        res.json({ success: true, id });
    } catch (error) {
        console.error("Save transcript error:", error);
        res.status(500).json({ error: "Failed to save transcript" });
    }
});

// GET /api/transcripts
router.get('/', requireAuth, async (req, res) => {
    try {
        const { limit, offset, search, lean } = req.query;

        const options = {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            search: search || undefined,
            lean: lean === 'true'
        };

        const list = await promptService.getAllTranscripts(req.auth.userId, options);
        res.json(list);
    } catch (error) {
        console.error("Fetch Transcripts Error:", error);
        res.status(500).json({ error: "Failed to fetch transcripts" });
    }
});

// GET /api/transcripts/:id
router.get('/:id', requireAuth, async (req, res) => {
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

// GET /api/transcripts/:id/assessments
router.get('/:id/assessments', requireAuth, async (req, res) => {
    try {
        const assessments = await promptService.getAssessmentsForTranscript(req.params.id, req.auth.userId);
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
});

// POST /api/transcripts/:id/assessments
router.post('/:id/assessments', requireAuth, validate(saveAssessmentSchema), async (req, res) => {
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

// PUT /api/transcripts/:id/assessment (Legacy)
router.put('/:id/assessment', requireAuth, validate(updateAssessmentSchema), async (req, res) => {
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

// GET /api/dashboard (Using promptService methods related to stats/transcripts)
router.get('/dashboard/stats', requireAuth, async (req, res) => {
    res.status(404).send('Not implemented here');
});

module.exports = router;
