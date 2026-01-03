const express = require('express');
const router = express.Router();
const promptService = require('../services/promptService');
const requireAuth = require('../middleware/auth');

const SYSTEM_AGENTS = {
    'transcriber': { name: 'Transcriber Bot', file: 'transcribe_audio.md', desc: 'Converts raw audio to text.' },
    'auditor': { name: 'Quality Auditor', file: 'validate_transcript.md', desc: 'Checks transcript quality and completeness.' },
    'analyst': { name: 'Clinical Analyst', file: 'assess_soap.md', desc: 'Generates clinical assessments.' },
    'architect': { name: 'Template Architect', file: 'analyze_template.md', desc: 'Analyzes DOCX templates for structure.' }
};

// GET /api/system-prompts
router.get('/', requireAuth, (req, res) => {
    res.json(Object.entries(SYSTEM_AGENTS).map(([key, val]) => ({ id: key, ...val })));
});

// GET /api/system-prompts/:id
router.get('/:id', requireAuth, async (req, res) => {
    const agent = SYSTEM_AGENTS[req.params.id];
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    try {
        const content = await promptService.loadSystemPrompt(agent.file);
        res.json({ id: req.params.id, content });
    } catch (err) {
        res.status(500).json({ error: "Failed to load prompt" });
    }
});

// PUT /api/system-prompts/:id
router.put('/:id', requireAuth, async (req, res) => {
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

module.exports = router;
