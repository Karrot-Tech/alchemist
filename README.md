# Alchemist AI

Alchemist is an AI-powered medical transcription and assessment platform. It allows clinicians to record sessions, generate transcripts, and create clinical documentation (SOAP notes) using Google Gemini AI.

## 🚀 Tech Stack

-   **Frontend**: React (Vite), TailwindCSS, Lucide Icons, Sonner (Toast), Clerk (Auth).
-   **Backend**: Node.js (Express), PostgreSQL (or Vercel Postgres), Google Gemini AI, Vercel Blob.
-   **Deployment**: Vercel (Client & Serverless Functions).

## 🛠️ Prerequisites

Ensure you have the following installed:

-   Node.js (v18+)
-   npm

You will need API Keys for:

-   **Clerk** (Authentication)
-   **Google Gemini** (AI Transcription & Analysis)
-   **Vercel Blob** (Audio & Template Storage)
-   **PostgreSQL** (Database)

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd alchemist
    ```

2.  **Install dependencies**:
    Alchemist has a monorepo-style structure with `client` and `server` folders.

    ```bash
    # Install Root Dependencies (concurrently)
    npm install

    # Install Client Dependencies
    cd client && npm install

    # Install Server Dependencies
    cd ../server && npm install
    ```

## ⚙️ Configuration (.env)

You need to configure environment variables for both Client and Server.

### Server (`server/.env`)
Create `server/.env` and add:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgres://user:pass@host:5432/db"

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services (Google Gemini)
GEMINI_API_KEY=AIzaSy...

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Optional Customization
GEMINI_MODEL_TRANSCRIBE=gemini-2.0-flash
GEMINI_MODEL_ASSESS=gemini-2.5-pro
CLIENT_URL=http://localhost:5173
```

### Client (`client/.env`)
Create `client/.env` and add:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## 🏃‍♂️ Running Locally

You can run both the client and server concurrently from the root directory:

```bash
# From the root directory
npm start
```

This command runs:
-   **Server**: `http://localhost:3000`
-   **Client**: `http://localhost:5173`

Alternatively, run them separately:

```bash
# Terminal 1 (Server)
cd server && npm start

# Terminal 2 (Client)
cd client && npm run dev
```

> **Note**: If you change `server.js`, you must restart the server manually (unless using nodemon).

## 📁 Project Structure

```
alchemist/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context (Transcription, Auth)
│   │   ├── pages/          # Application Routes/Pages
│   │   └── App.jsx         # Main Entry & Routing
│   └── vite.config.js      # Vite Configuration (Proxy to API)
│
├── server/                 # Node.js Backend
│   ├── middleware/         # Auth & Utility Middleware
│   ├── prompts/            # System Prompts & Markdown Agents
│   ├── services/           # Database & Logic Services
│   └── server.js           # Express App Entry Point
│
├── api/                    # Vercel Serverless Entry Point
└── package.json            # Root Scripts
```

## 🚢 Deployment

The project is optimized for **Vercel**.

1.  Connect your GitHub repository to Vercel.
2.  Import the project.
3.  Set the **Root Directory** to `./` (root).
4.  Add all **Environment Variables** in Vercel.
5.  Deploy!

`vercel.json` is configured to route `/api/*` requests to the serverless function.

## 📝 License

Private / Proprietary.
