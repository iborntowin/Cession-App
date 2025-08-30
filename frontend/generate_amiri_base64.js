import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontPath = path.join(__dirname, 'static', 'Amiri-Regular.ttf');
const outputPath = path.join(__dirname, 'static', 'fonts', 'Amiri-Regular-normal.js');

try {
  const fontData = fs.readFileSync(fontPath);
  const base64Font = fontData.toString('base64');

  const jsContent = `export default '${base64Font}';`;
  fs.writeFileSync(outputPath, jsContent);

  console.log('Amiri-Regular font base64 generated successfully at:', outputPath);
} catch (error) {
  console.error('Error generating base64 font:', error.message);
}
