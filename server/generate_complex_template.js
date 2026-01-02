const docx = require('docx');
const fs = require('fs');
const path = require('path');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // Title
            new Paragraph({
                text: "Comprehensive Psychiatric Evaluation",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),

            // Section I: Identifying Info
            new Paragraph({
                text: "I. Identifying Information",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Patient Name: ", bold: true }), new TextRun("{patient_name}"),
                    new TextRun({ text: "\tDOB: ", bold: true }), new TextRun("{dob}"),
                    new TextRun({ text: "\tDate: ", bold: true }), new TextRun("{date}"),
                ],
                spacing: { after: 200 },
            }),

            // Section II: Presenting Concerns
            new Paragraph({
                text: "II. Chief Complaint (CC)",
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{chief_complaint}")] }),

            new Paragraph({
                text: "History of Present Illness (HPI)",
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{hpi}")] }),

            // Section III: History
            new Paragraph({
                text: "III. Psychiatric History",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
            }),
            new Paragraph({ text: "Past Diagnoses & Hospitalizations:", bold: true }),
            new Paragraph({ children: [new TextRun("{past_psych_history}")] }),

            new Paragraph({ text: "Medication History (Trials/Failures):", bold: true, spacing: { before: 100 } }),
            new Paragraph({ children: [new TextRun("{medication_history}")] }),

            new Paragraph({ text: "Substance Use History:", bold: true, spacing: { before: 100 } }),
            new Paragraph({ children: [new TextRun("{substance_use}")] }),

            new Paragraph({
                text: "Medical History",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{medical_history}")] }),
            new Paragraph({ text: "Allergies: {allergies}", spacing: { before: 100 } }),

            // Section IV: Mental Status Exam (MSE)
            new Paragraph({
                text: "IV. Mental Status Examination (MSE)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
            }),
            new Paragraph({ children: [new TextRun({ text: "Appearance: ", bold: true }), new TextRun("{mse_appearance}")] }),
            new Paragraph({ children: [new TextRun({ text: "Behavior: ", bold: true }), new TextRun("{mse_behavior}")] }),
            new Paragraph({ children: [new TextRun({ text: "Speech: ", bold: true }), new TextRun("{mse_speech}")] }),
            new Paragraph({ children: [new TextRun({ text: "Mood: ", bold: true }), new TextRun("{mse_mood}")] }),
            new Paragraph({ children: [new TextRun({ text: "Affect: ", bold: true }), new TextRun("{mse_affect}")] }),
            new Paragraph({ children: [new TextRun({ text: "Thought Process: ", bold: true }), new TextRun("{mse_thought_process}")] }),
            new Paragraph({ children: [new TextRun({ text: "Thought Content: ", bold: true }), new TextRun("{mse_thought_content}")] }),
            new Paragraph({ children: [new TextRun({ text: "Insight/Judgment: ", bold: true }), new TextRun("{mse_insight}")] }),

            // Section V: Risk
            new Paragraph({
                text: "V. Risk Assessment",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{risk_assessment}")] }),

            // Section VI: Assessment & Plan
            new Paragraph({
                text: "VI. Diagnostic Impression",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{diagnosis}")] }),

            new Paragraph({
                text: "Treatment Plan",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({ children: [new TextRun("{treatment_plan}")] }),

            // Footer
            new Paragraph({
                children: [new TextRun({ text: "\nElectronically Signed", italics: true })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 600 },
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    const outputPath = path.join(__dirname, 'Complex_Psych_Eval.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated Complex_Psych_Eval.docx at ${outputPath}`);
});
