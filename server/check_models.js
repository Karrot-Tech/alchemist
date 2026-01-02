const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // Note: older SDKs might expose this differently, but let's try the standard way
        // Actually, listing models isn't always directly exposed on the helper, 
        // but usually valid model names are known.
        // Let's try to just run a simple prompt on 'gemini-1.5-flash-001' to see if that works.

        console.log("Testing specific models...");

        const modelsToTest = ["gemini-1.5-flash-001", "gemini-1.5-flash", "gemini-1.0-pro"];

        for (const modelName of modelsToTest) {
            console.log(`Testing ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`SUCCESS: ${modelName} worked! Response: ${result.response.text()}`);
                return;
            } catch (e) {
                console.log(`FAILED: ${modelName} - ${e.message}`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
