# Alchemist

**Alchemist** is an AI-powered clinical documentation assistant. It records patient sessions, transcribes audio, and generates structured SOAP notes using custom DOCX templates.

## Repository Structure
- **`client/`**: React Frontend (Vite + Tailwind).
- **`server/`**: Node.js Backend (Express + Gemini AI).
- **`api/`**: Serverless entry point for Vercel deployment.

## Quick Start
1. **Install Dependencies**:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
2. **Environment Variables**:
   - Configure `.env` in `client/` (Clerk Key).
   - Configure `.env` in `server/` (Gemini, DB, Blob, Clerk Secret).
3. **Run Locally**:
   - Start Server: `cd server && npm start`
   - Start Client: `cd client && npm run dev`

## Deployment
This project is configured for **Vercel**.
- **Frontend**: Deploys as a static site from `client/dist`.
- **Backend**: Deploys as Serverless Functions via `api/index.js`.
- **Config**: See `vercel.json` for routing and rewrites.

## Status
- **Client**: Production Ready (Build Verified).
- **Server**: Production Ready (Secured & Refactored).
