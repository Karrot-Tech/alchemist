const docx = require('docx');
const fs = require('fs');
const path = require('path');

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const OUTPUT_DIR = path.resolve(__dirname, '../../mock_samples');

const soapDoc = new Document({
    sections: [{
        children: [
            new Paragraph({ text: "Psychiatric SOAP Note", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),

            new Paragraph({ children: [new TextRun({ text: "Patient Name: ", bold: true }), new TextRun("{patient_name}")] }),
            new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun("{date}")] }),

            new Paragraph({ text: "Subjective", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{subjective}")] }),

            new Paragraph({ text: "Objective", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{objective}")] }),

            new Paragraph({ text: "Assessment", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{assessment}")] }),

            new Paragraph({ text: "Plan", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{plan}")] }),

            new Paragraph({ text: "Medications:", bold: true, spacing: { before: 200 } }),
            new Paragraph({ children: [new TextRun("{medications}")] }),
        ]
    }]
});

Packer.toBuffer(soapDoc).then((buffer) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, 'Standard_SOAP.docx'), buffer);
    console.log("Generated Standard_SOAP.docx");
});
