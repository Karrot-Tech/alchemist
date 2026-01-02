const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const path = require("path");
const cors = require('cors');
require('dotenv').config();
const promptService = require('./services/promptService');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => res.send('pong')); // DEBUG ROUTE

// Middleware (Moved Up)
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Transcript Management Routes ---
app.post('/api/transcripts', async (req, res) => {
    try {
        const { patient_name, date, content } = req.body;
        if (!patient_name || !date || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const id = await promptService.saveTranscript(patient_name, date, content);
        res.json({ success: true, id });
    } catch (error) {
        console.error("Save transcript error:", error);
        res.status(500).json({ error: "Failed to save transcript" });
    }
});

app.get('/api/transcripts', async (req, res) => {
    try {
        const list = await promptService.getAllTranscripts();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transcripts" });
    }
});

app.get('/api/transcripts/:id', async (req, res) => {
    try {
        const item = await promptService.getTranscriptById(req.params.id);
        if (!item) return res.status(404).json({ error: "Transcript not found" });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transcript" });
    }
});

// (Middleware moved to top)
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Temp storage for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in .env");
}
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Alchemist Server is running' });
});

// ---------------------------------------------------------
// Endpoint A: Audio-to-Transcript
// ---------------------------------------------------------
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file uploaded" });
        }

        const filePath = req.file.path;
        console.log(`Processing upload: ${filePath}`);

        // 1. Upload to Gemini
        let mimeType = req.file.mimetype;
        // Fix for "application/octet-stream" issue from some browsers/OS
        if (mimeType === 'application/octet-stream' && req.file.originalname.endsWith('.mp3')) {
            mimeType = "audio/mp3";
        }
        // Fallback
        mimeType = mimeType || "audio/mp3";

        const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType: mimeType,
            displayName: req.file.originalname,
        });

        console.log(`Uploaded to Gemini: ${uploadResult.file.uri}`);

        // 2. Poll until processing is complete
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            console.log("Processing audio...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        if (file.state === "FAILED") {
            throw new Error("Audio processing failed by Gemini");
        }

        console.log(`Audio processed. File State: ${file.state}. Generating transcript...`);

        // 3. Generate Transcript
        const modelName = process.env.GEMINI_MODEL_TRANSCRIBE || "gemini-2.0-flash";
        console.log(`Sending request to ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const promptText = await promptService.get('transcribe_audio', "Transcribe this audio strictly. Do not summarize. Identify speakers if possible.");
        const result = await model.generateContent([
            promptText,
            {
                fileData: {
                    fileUri: uploadResult.file.uri,
                    mimeType: uploadResult.file.mimeType,
                },
            },
        ]);

        const transcriptText = result.response.text();

        // Cleanup: Delete local file
        fs.unlinkSync(filePath);
        // Optional: Delete from Gemini to save space/privacy
        // await fileManager.deleteFile(uploadResult.file.name); 

        res.json({ transcript: transcriptText });

    } catch (error) {
        console.error("Transcribe Error:", error);
        res.status(500).json({ error: error.message });
        // Try to cleanup local file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

// ---------------------------------------------------------
// Endpoint B: Validation & Quality Score
// ---------------------------------------------------------
app.post('/validate', async (req, res) => {
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
            model: process.env.GEMINI_MODEL_VALIDATE || "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        let promptText = await promptService.get('validate_transcript', "Analyze this transcript quality:\n\n{{transcript}}");
        promptText = promptText.replace('{{transcript}}', transcript);
        const result = await model.generateContent(promptText);

        res.json(JSON.parse(result.response.text()));

    } catch (error) {
        console.error("Validation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// Endpoint C: SOAP Assessment (AI Extraction)
// ---------------------------------------------------------
app.post('/assess-soap', async (req, res) => {
    try {
        const { transcript, additional_notes, template_id } = req.body;
        console.log("Received Assessment Request for transcript length:", transcript ? transcript.length : 0);
        if (!transcript) return res.status(400).json({ error: "No transcript provided" });

        let schema;
        let promptTemplate;

        // 1. Determine Schema & Prompt Strategy
        if (template_id) {
            console.log(`Using custom template ID: ${template_id}`);
            const template = await promptService.getTemplate(template_id);
            if (!template) return res.status(404).json({ error: "Template not found" });

            try {
                schema = JSON.parse(template.schema_json);
            } catch (e) {
                console.error("Invalid Schema JSON in DB:", template.schema_json);
                return res.status(500).json({ error: "Corrupt Template Schema" });
            }
            promptTemplate = template.prompt_text;
        } else {
            console.log("Using Default SOAP Schema");
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

            const defaultAssessPrompt = `
            You are an expert Psychiatrist. Your goal is to create a structured SOAP Note based *strictly* on the provided patient transcript.

            <instructions>
            1.  **Grounding**: Do not hallucinate symptoms, medications, or events. If information is not present in the transcript, state "Not Reported" or leave it generic.
            2.  **Terminology**: Use professional medical terminology.
            3.  **Format**: Return *only* a valid JSON object.
            </instructions>

            <doctor_notes>
            {{notes}}
            </doctor_notes>
            
            <transcript>
            {{transcript}}
            </transcript>
            `;
            promptTemplate = await promptService.get('assess_soap', defaultAssessPrompt);
        }

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL_ASSESS || "gemini-2.5-pro",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const prompt = promptTemplate
            .replace(/\{\{notes\}\}/g, additional_notes || 'None') // Default
            .replace(/\{\{transcript\}\}/g, transcript)           // Default
            .replace(/\{doctor_notes\}/g, transcript);            // Custom Template standard

        console.log("FINAL PROMPT SENT TO GEMINI (First 500 chars):", prompt.substring(0, 500));
        console.log("FINAL PROMPT LENGTH:", prompt.length);

        const result = await model.generateContent(prompt);
        let text = "";

        if (process.env.NODE_ENV !== 'production') {
            console.log("Gemini Response received.");

            // Deep Debugging
            const response = await result.response;
            console.log("Full Response Object:", JSON.stringify(response, null, 2));

            if (!response.candidates || response.candidates.length === 0) {
                console.error("No candidates returned. Safety filter?");
                return res.status(500).json({ error: "AI returned no results. Content might be flagged." });
            }

            const candidate = response.candidates[0];
            console.log("Finish Reason:", candidate.finishReason);
            console.log("Safety Ratings:", JSON.stringify(candidate.safetyRatings, null, 2));

            text = response.text();
            console.log("Raw Assessment Response:", text);
        } else {
            text = result.response.text();
        }

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Attempt parse
        try {
            const json = JSON.parse(text);
            res.json(json);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Failed Text:", text);
            // Fallback to partial JSON or error
            res.status(500).json({ error: "Failed to parse AI response as JSON", raw_text: text });
        }

    } catch (error) {
        console.error("Assessment Error (Catch Block):", error);
        // Ensure we send JSON even on error
        res.status(500).json({ error: error.message || "Unknown Error" });
    }
});

// ---------------------------------------------------------
// Endpoint: Template Management
// ---------------------------------------------------------

// GET /api/templates - List all
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await promptService.getAllTemplates();
        res.json(templates);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/templates/analyze - Upload .docx, extract placeholders, AI generates Schema
app.post('/api/templates/analyze', upload.single('template'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No template file uploaded" });

        const filePath = req.file.path;
        console.log(`Analyzing template: ${filePath}`);

        // 1. Extract Placeholders from Docx
        const content = fs.readFileSync(filePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Very basic extraction: Use regex on the raw XML content of the document
        // Docxtemplater doesn't expose a simple "listKeys" API easily without plugins.
        // Reading document.xml is robust enough for simple {tags}.
        const docXml = zip.file("word/document.xml").asText();
        const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
        const matches = new Set();
        let match;
        while ((match = placeholderRegex.exec(docXml)) !== null) {
            matches.add(match[1]);
        }
        const placeholders = Array.from(matches);
        console.log("Found placeholders:", placeholders);

        if (placeholders.length === 0) {
            return res.json({
                placeholders: [],
                schema_suggestion: {},
                prompt_suggestion: ""
            });
        }

        // 2. Ask Gemini to generate Schema & Prompt
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const analysisPrompt = `
        I have a .docx template with the following placeholders: ${JSON.stringify(placeholders)}.
        
        1. Create a JSON Schema (properties) to extract these fields from a psychiatric transcript.
           - keys MUST match the placeholders exactly.
           - Add descriptive 'description' for each.
        2. Create a System Propmt for an AI to extract this information.
           - Include "doctor_notes" handling in the prompt.
           - P.S.: Construct the prompt with a dedicated "## SAFEGUARDS" section.
           - Rule 1: "Strict Grounding: You are forbidden from inventing names, dates, or details."
           - Rule 2: "Null Handling: If a field is not explicitly present, use 'N/A' or 'Unknown'."
           - Rule 3: "Privacy: Do not output Real Names unless explicitly confirmed in text. Defaults to 'Patient'."

        Output JSON format:
        {
            "schema": { ...json_schema_object... },
            "prompt_text": "...string..."
        }
        `;

        const result = await model.generateContent(analysisPrompt);
        let text = result.response.text();
        console.log("Raw Analysis Response:", text);

        // Cleanup markdown
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let aiResponse;
        try {
            aiResponse = JSON.parse(text);
        } catch (parseErr) {
            console.error("Failed to parse Analysis JSON:", text);
            throw new Error("AI returned invalid JSON: " + text.substring(0, 50) + "...");
        }

        // Cleanup local file? Keep it if we are going to save it later.
        // For now, client uploads again to Save, so specific temp file can be deleted?
        // Actually, we want to return the 'path' so the client can reference it in "Save".
        // BUT multer 'dest' is temporary. 
        // We will return the upload path. Client must send it back to 'save'.

        res.json({
            placeholders,
            file_path: filePath, // Client sends this back to /api/templates confirm
            schema_suggestion: aiResponse.schema,
            prompt_suggestion: aiResponse.prompt_text
        });

    } catch (err) {
        console.error("Template Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// Endpoint D: Final Document Generation
// ---------------------------------------------------------
app.post('/generate-document', async (req, res) => {
    try {
        // Now accepts the final JSON object directly
        const { data } = req.body;

        if (!data) return res.status(400).json({ error: "No data provided for generation" });

        console.log("Generating Doc for:", data.patient_name);

        // Load SOAP Template
        const templatePath = path.resolve(__dirname, 'template_soap.docx');
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: "SOAP Template file not found on server." });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Render the document
        // Ensure nulls are handled
        doc.render({
            patient_name: data.patient_name || "Unknown",
            subjective: data.subjective || "N/A",
            objective: data.objective || "N/A",
            assessment: data.assessment || "N/A",
            plan: data.plan || "N/A",
            medications: data.medications || "None",
        });

        const buf = doc.getZip().generate({ type: "nodebuffer" });

        // Send file
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=${(data.patient_name || 'soap_note').replace(/ /g, '_')}.docx`
        });

        res.send(buf);

    } catch (error) {
        console.error("Doc Gen Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static React files (Placeholder for now, effective after build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

// (Moved Transcript Routes up)

// Start Server
app.listen(PORT, () => {
    console.log(`Server & Client running on port ${PORT}`);
});
