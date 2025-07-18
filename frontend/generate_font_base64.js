import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontPath = path.join(__dirname, 'static', 'fonts', 'NotoSansArabic-Regular.ttf');
const fontData = fs.readFileSync(fontPath);
const base64Font = fontData.toString('base64');

console.log('NotoSansArabic-Regular Base64:');
console.log(base64Font); 