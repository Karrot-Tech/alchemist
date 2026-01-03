const { z } = require('zod');

/**
 * Middleware factory that validates request body against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 */
const validate = (schema) => (req, res, next) => {
    try {
        // .parse() throws if validation fails
        // .safeParse() returns an object result
        const result = schema.safeParse(req.body);

        if (!result.success) {
            // Format Zod errors into a readable string or object
            const formattedErrors = result.error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                error: "Validation Failed",
                details: formattedErrors
            });
        }

        // Replace req.body with the sanitized/parsed data
        req.body = result.data;
        next();
    } catch (error) {
        return res.status(500).json({ error: "Internal Validation Error" });
    }
};

module.exports = validate;
