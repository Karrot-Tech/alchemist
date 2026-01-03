const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

// Using 'WithAuth' allows lax checking (req.auth is present), but we want strict.
// For simplicity, we'll implement a wrapper that checks req.auth.userId
const authMiddleware = ClerkExpressWithAuth();

const requireAuth = (req, res, next) => {
    authMiddleware(req, res, (err) => {
        if (err) return next(err);
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        next();
    });
};

module.exports = requireAuth;
