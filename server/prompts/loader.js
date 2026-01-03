const fs = require('fs');
const path = require('path');

function loadPrompts() {
    const promptsDir = __dirname;
    const files = fs.readdirSync(promptsDir);

    return files
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const key = file.replace('.md', '');
            const text = fs.readFileSync(path.join(promptsDir, file), 'utf-8').trim();
            return { key, text };
        });
}

module.exports = { loadPrompts };
