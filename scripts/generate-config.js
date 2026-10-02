const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const outPath = path.join(__dirname, '..', 'js', 'config.js');

if (!fs.existsSync(envPath)) {
    console.error('Missing .env — create one with CARTO_API_KEY=...');
    process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const match = env.match(/^CARTO_API_KEY=(.+)$/m);
if (!match) {
    console.error('CARTO_API_KEY not found in .env');
    process.exit(1);
}

const key = match[1].trim();
fs.writeFileSync(
    outPath,
    `// Generated from .env — do not commit\nwindow.CARTO_API_KEY = '${key}';\n`
);
console.log('Wrote js/config.js');
