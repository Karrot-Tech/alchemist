# Alchemist - Frontend

The React frontend for the Alchemist clinical documentation platform.

## Features
- **Secure Authentication**: Integrated with Clerk for user management.
- **Audio Capture**: Browser-based audio recording and uploading.
- **Real-time Updates**: Optimized data fetching using `useAuthFetch`.
- **Responsive UI**: Tailwind CSS styling for Desktop and Mobile (iPad) support.

## Tech Stack
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **State/Auth**: Clerk React SDK, Context API

## Setup
1. `npm install`
2. Create `.env` with:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```
3. `npm run dev`

## Build
Run `npm run build` to compile for production (outputs to `dist/`).
