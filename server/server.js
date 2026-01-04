const express = require('express');
const cors = require('cors');
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '.env') });
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import Routes
const patientRoutes = require('./routes/patients');
const transcriptRoutes = require('./routes/transcripts');
const agentRoutes = require('./routes/agents');
const templateRoutes = require('./routes/templates');
const aiRoutes = require('./routes/ai');
const promptService = require('./services/promptService');
const requireAuth = require('./middleware/auth');

const app = express();


// Global Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://clerk.ppai.dev", "https://*.clerk.accounts.dev", "https://clerk-telemetry.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://clerk.ppai.dev", "https://*.clerk.accounts.dev"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.vercel.store", "https://img.clerk.com", "https://*.public.blob.vercel-storage.com"],
            mediaSrc: ["'self'", "blob:", "https://*.vercel.store", "https://*.public.blob.vercel-storage.com"],
            workerSrc: ["'self'", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiter (AI Endpoints)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: "Too many AI requests, please try again later." }
});

// Helper for Dashboard (Needs to stay or be in a general router)
// We didn't create a general router, so keeping dashboard route here but using promptService
app.get('/api/dashboard', requireAuth, async (req, res) => {
    console.log("Dashboard Endpoint Hit. User:", req.auth.userId);
    try {
        const stats = await promptService.getDashboardStats(req.auth.userId);
        const recentTranscripts = await promptService.getAllTranscripts(req.auth.userId, {
            limit: 5,
            lean: true
        });

        const recentActivity = recentTranscripts.map(t => ({
            id: t.id,
            patient: t.patient_name,
            date: t.date,
            created_at: t.created_at,
            summary: t.content ? (t.content.length > 100 ? t.content.substring(0, 100) + '...' : t.content) : 'No content',
            type: 'session',
            assessment_count: t.assessment_count
        }));

        res.json({ stats, recentActivity });
    } catch (error) {
        console.error("Dashboard Error Detailed:", error);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
});


// Mount Routes
app.use('/api/patients', patientRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/system-prompts', agentRoutes);
app.use('/api/templates', templateRoutes);
// AI routes were mixed. Some at /api/..., some at /validate.
// In ai.js we defined routes like router.post('/upload') -> /api/upload if mounted at /api
// But validation was at /validate.
// Let's check ai.js definitions:
// /upload, /status, /generate, /validate, /assess-soap, /generate-document
// If we mount aiRoutes at /api, then we get /api/upload, /api/status, /api/generate.
// But /validate becomes /api/validate.
// server.js previously had /validate (root relative).
// The client likely calls /validate.
// I should mount aiRoutes at root '/' but inside ai.js I prefixed some with /api/ and some without?
// Let's re-read ai.js I just wrote.
// router.post('/upload') ... router.get('/status') ... router.post('/generate-document')
// server.js had: /api/upload, /api/status, /api/generate
// but /validate, /assess-soap, /generate-document were NOT /api prefixed (lines 432, 476, 761 in original server.js).
// Wait, actually looking at line 51 of original server.js: app.use(['/api/generate', '/api/upload', '/assess-soap', '/validate', '/api/templates/analyze'], aiLimiter);
// Yes, some are /api and some not.
// To support this with one router, I should mount it at `/` and inside use full paths, OR mount at `/api` and change client?
// Changing client is risky.
// Better to simple mount the router at `/` and inside `ai.js`, explicitly define paths.
// In `ai.js` I wrote: `router.post('/upload'...)`. If mounted at `/`, this matches `/upload`. But it should be `/api/upload`.
// I MUST fix `ai.js` paths or mount it differently.
// Strategy: I will fix `ai.js` paths to match the original server.js exactly.
// Then mount at `/`.

// Applying rate limiter
app.use(['/api/generate', '/api/upload', '/assess-soap', '/validate', '/api/templates/analyze'], aiLimiter);

// For AI routes, since they have mixed prefixes, we'll verify ai.js content.
// I suspect I wrote generic paths in ai.js. Let's overwrite ai.js first with CORRECT paths matching server.js.
// original server.js:
// /api/upload
// /api/status
// /api/generate
// /validate
// /assess-soap
// /generate-document

// In my previous tool call for ai.js:
// router.post('/upload'...) -> would need mount at /api
// router.post('/validate'...) -> would need mount at /
// This is inconsistent.

// I will overwrite ai.js with explicit full paths and mount at / in server.js.
// But wait, router paths are relative to mount point.
// If I mount at /, then I can use full paths in router.
// router.post('/api/upload', ...)
// router.post('/validate', ...)
// Yes.

app.use('/', aiRoutes);


// Basic Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Alchemist Server is running' });
});

// Serve static React files
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA Catch-all Route
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server & Client running on port ${PORT}`);
    });
}

module.exports = app;
