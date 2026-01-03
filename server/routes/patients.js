const express = require('express');
const router = express.Router();
const { z } = require('zod');
const promptService = require('../services/promptService');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Schemas
const createPatientSchema = z.object({
    name: z.string().min(1, "Name is required"),
    mrn: z.string().optional(),
    dob: z.string().optional() // Could be .date() or regex if stricter needed
});

const updatePatientSchema = createPatientSchema.partial(); // Allow partial updates if needed, though PUT usually implies full replacement or defined fields. Logic below expects these fields.

// GET /api/patients
router.get('/', requireAuth, async (req, res) => {
    try {
        const patients = await promptService.getAllPatients(req.auth.userId);
        res.json(patients);
    } catch (err) {
        res.status(500).json({ error: "Failed to load patients" });
    }
});

// POST /api/patients
router.post('/', requireAuth, validate(createPatientSchema), async (req, res) => {
    try {
        const { name, mrn, dob } = req.body;
        // Validation handled by middleware
        const newPatient = await promptService.createPatient(name, mrn, dob, req.auth.userId);
        res.json(newPatient);
    } catch (err) {
        res.status(500).json({ error: "Failed to create patient" });
    }
});

// PUT /api/patients/:id
router.put('/:id', requireAuth, validate(createPatientSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mrn, dob } = req.body;

        const updated = await promptService.updatePatient(id, name, mrn, dob, req.auth.userId);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update patient" });
    }
});

module.exports = router;
