// Writes lib/translations.showcase.en.json: English for every text in the trial dataset (run after editing scripts/showcase).
import { writeFile } from 'node:fs/promises';
import { createShowcaseData } from './data.mjs';
const { translations } = createShowcaseData('unused');
await writeFile(new URL('../../lib/translations.showcase.en.json', import.meta.url), JSON.stringify(translations, null, 1) + '\n');
console.log(`${Object.keys(translations).length} bản dịch cho dữ liệu dùng thử.`);
