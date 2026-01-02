const docx = require('docx');
const fs = require('fs');
const path = require('path');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const OUTPUT_DIR = path.resolve(__dirname, '../../mock_samples');

// Helper to save doc
const saveDoc = (doc, filename) => {
    Packer.toBuffer(doc).then((buffer) => {
        const outputPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(outputPath, buffer);
        console.log(`Generated ${filename}`);
    });
};

// 1. Child & Adolescent Eval
const childEval = new Document({
    sections: [{
        children: [
            new Paragraph({ text: "Child & Adolescent Psychiatric Evaluation", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),

            new Paragraph({ text: "I. Demographics", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun({ text: "Child Name: ", bold: true }), new TextRun("{child_name}")] }),
            new Paragraph({ children: [new TextRun({ text: "Age: ", bold: true }), new TextRun("{age}")] }),
            new Paragraph({ children: [new TextRun({ text: "Grade/School: ", bold: true }), new TextRun("{school_grade}")] }),
            new Paragraph({ children: [new TextRun({ text: "Guardian(s): ", bold: true }), new TextRun("{guardians}")] }),

            new Paragraph({ text: "II. Presenting Problems", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{presenting_problem}")] }),

            new Paragraph({ text: "III. Developmental History", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{developmental_history}")] }),

            new Paragraph({ text: "IV. Family & Social History", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{family_social_history}")] }),

            new Paragraph({ text: "V. School Performance", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{school_performance}")] }),

            new Paragraph({ text: "VI. Mental Status Exam", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("Appearance/Behavior: {mse_behavior}")] }),
            new Paragraph({ children: [new TextRun("Mood/Affect: {mse_mood_affect}")] }),
            new Paragraph({ children: [new TextRun("Attention/Concentration: {mse_attention}")] }),

            new Paragraph({ text: "VII. Assessment & Plan", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{diagnosis_impression}")] }),
            new Paragraph({ children: [new TextRun("{treatment_recommendations}")] }),
        ]
    }]
});

// 2. Psychotherapy Progress Note (DAP Format)
const therapyNote = new Document({
    sections: [{
        children: [
            new Paragraph({ text: "Psychotherapy Progress Note", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),

            new Paragraph({ children: [new TextRun({ text: "Client: ", bold: true }), new TextRun("{client_name}")] }),
            new Paragraph({ children: [new TextRun({ text: "Session Date: ", bold: true }), new TextRun("{session_date}")] }),
            new Paragraph({ children: [new TextRun({ text: "Session Type: ", bold: true }), new TextRun("{session_type}")] }), // e.g., CFT, CBT

            new Paragraph({ text: "Data (D)", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ text: "Subjective report, topics discussed, interventions used." }),
            new Paragraph({ children: [new TextRun("{data_subjective}")] }),

            new Paragraph({ text: "Assessment (A)", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ text: "Therapist's clinical understanding, progress towards goals." }),
            new Paragraph({ children: [new TextRun("{assessment_progress}")] }),

            new Paragraph({ text: "Plan (P)", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ text: "Homework, next session focus, referrals." }),
            new Paragraph({ children: [new TextRun("{plan_next_steps}")] }),

            new Paragraph({ text: "Risk Assessment:", bold: true, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{risk_status}")] }),
        ]
    }]
});

// Execute
saveDoc(childEval, 'Sample_Child_Eval.docx');
saveDoc(therapyNote, 'Sample_Therapy_Note.docx');
