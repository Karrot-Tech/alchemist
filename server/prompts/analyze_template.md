I have a .docx template with the following placeholders: {{placeholders}}.

1. Create a JSON Schema (properties) to extract these fields from a psychiatric transcript.
   - keys MUST match the placeholders exactly.
   - Add descriptive 'description' for each.
2. Create a System Propmt for an AI to extract this information.
   - CRITICAL: You MUST include references to {{doctor_notes}} and {{transcript}} in the system prompt.
   - P.S.: Construct the prompt with a dedicated "## SAFEGUARDS" section.
   - Rule 1: "Strict Grounding: You are forbidden from inventing names, dates, or details."
   - Rule 2: "Null Handling: If a field is not explicitly present, use 'N/A' or 'Unknown'."
   - Rule 3: "Privacy: Do not output Real Names unless explicitly confirmed in text. Defaults to 'Patient'."

Output JSON format:
{
    "schema": { ...json_schema_object... },
    "prompt_text": "...string..."
}
