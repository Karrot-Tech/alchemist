const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = path.resolve(__dirname, '../../mock_samples/transcripts');
const OUTPUT_DIR = path.resolve(__dirname, '../../mock_samples/audio');
const TEMP_DIR = path.resolve(__dirname, '../../mock_samples/temp_audio');

// Voice Mapping (Verified Installed)
const VOICES = {
    'Doctor': 'Daniel',      // UK Male (Professional) - Replaces missing Alex
    'Patient': 'Samantha',   // US Female
    'Mother': 'Kathy',       // US Female (Distinct from Samantha)
    'Father': 'Ralph',       // US Male (Deep)
    'Timmy': 'Junior',       // US Male (Child)
    'default': 'Daniel'
};

// Ensure dirs exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function cleanText(text) {
    return text.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function processFile(filename) {
    if (!filename.endsWith('.txt')) return;

    console.log(`Processing ${filename}...`);
    const content = fs.readFileSync(path.join(SOURCE_DIR, filename), 'utf-8');
    const lines = content.split('\n');
    let fileList = [];

    // Clear temp dir
    fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));

    let partCounter = 0;

    lines.forEach((line) => {
        const partNameRaw = `raw_${String(partCounter).padStart(4, '0')}.aiff`;
        const partNameNorm = `norm_${String(partCounter).padStart(4, '0')}.wav`; // Normalize to WAV
        const rawPath = path.join(TEMP_DIR, partNameRaw);
        const normPath = path.join(TEMP_DIR, partNameNorm);
        let created = false;

        // Parse "Speaker: Text"
        const match = line.match(/^([A-Za-z]+): (.+)/);
        if (match) {
            const speaker = match[1];
            const text = cleanText(match[2]);
            const voice = VOICES[speaker] || VOICES['default'];

            try {
                // 1. Generate Raw AIFF
                execSync(`say -v ${voice} -r 175 -o "${rawPath}" "${text}"`);
                created = true;
            } catch (e) {
                console.warn(`Failed to generate audio for line: ${line}`);
            }
        } else if (line.trim().startsWith('[')) {
            // 1s Silence
            try {
                // Generate silence directly as WAV
                execSync(`ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -f wav "${normPath}" -loglevel error`);
                fileList.push(`file '${normPath}'`);
                partCounter++;
                return; // Skip normalization step for separation logic
            } catch (e) {
                console.error("Silence gen failed", e);
            }
        }

        if (created) {
            // 2. Normalize to standard WAV (24k mono - usually safe for speech)
            // Using 24000Hz to match common speech synthesis output and reduce conflicts
            try {
                execSync(`ffmpeg -y -i "${rawPath}" -ac 1 -ar 24000 -f wav "${normPath}" -loglevel error`);
                fileList.push(`file '${normPath}'`);
                partCounter++;
            } catch (e) {
                console.error(`Normalization failed for ${rawPath}`, e);
            }
        }
    });

    if (fileList.length === 0) return;

    // Create concat list file
    const concatListPath = path.join(TEMP_DIR, 'concat_list.txt');
    fs.writeFileSync(concatListPath, fileList.join('\n'));

    const outputFilename = filename.replace('.txt', '.mp3');
    const finalPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(`Stitching to ${outputFilename}...`);
    // FFMPEG Concat
    try {
        execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 2 "${finalPath}" -loglevel error`);
        console.log(`Success: ${finalPath}`);
    } catch (e) {
        console.error("FFMPEG Stitch failed", e);
    }
}

// Run for all txt files
fs.readdirSync(SOURCE_DIR).forEach(processFile);

// Cleanup
// fs.rmSync(TEMP_DIR, { recursive: true, force: true });
console.log("Done.");
