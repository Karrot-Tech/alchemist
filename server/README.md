# Alchemist - Backend

The Express/Node.js backend for the Alchemist platform.

## Architecture
This server uses a modular routing architecture:
- `server.js`: Entry point, middleware configuration.
- `routes/patients.js`: Patient CRUD operations.
- `routes/transcripts.js`: Transcript management & assessments.
- `routes/templates.js`: DOCX template management & analysis.
- `routes/agents.js`: System prompt configuration.
- `routes/ai.js`: Core AI features (Upload, Transcription, Validation).

## Tech Stack
- **Runtime**: Node.js (Express 5)
- **Database**: PostgreSQL (`pg`)
- **AI**: Google Gemini (`@google/generative-ai`)
- **Storage**: Vercel Blob
- **Validation**: Zod & Multer

## Setup
1. `npm install`
2. Create `.env` with:
   ```
   GEMINI_API_KEY=...
   BLOB_READ_WRITE_TOKEN=...
   DATABASE_URL=...
   CLERK_SECRET_KEY=...
   ```
3. `npm start` (Runs on port 3000)

## Security
- **Authentication**: All routes key protected via Clerk middleware (`requireAuth`).
- **Validation**: API inputs validated using Zod schemas.
- **CSP**: Strict Content Security Policy configured for production safety.
