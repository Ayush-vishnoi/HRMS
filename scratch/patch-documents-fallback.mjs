// Patches the employee-side fallback status label in the documents table row
// (src/app/documents/page.tsx) so Verified-but-not-shared docs no longer show
// "Awaiting HR review". Idempotent: skips if the new label is already present.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/app/documents/page.tsx';
const lines = readFileSync(FILE, 'utf8').split('\n');

const rowIdx = lines.findIndex(
  (line) => line.includes('<tr key={document.id}') && line.includes('Awaiting HR review')
);
if (rowIdx === -1) {
  if (lines.some((line) => line.includes('Verified — awaiting HR share'))) {
    console.log('OK: already patched, nothing to do.');
    process.exit(0);
  }
  console.error('ABORT: table row line not found.');
  process.exit(1);
}

const OLD = "{document.sharedByHr ? 'Processing' : 'Awaiting HR review'}";
const NEW =
  "{document.status === 'Verified' ? 'Verified — awaiting HR share' : document.sharedByHr ? 'Processing' : 'Awaiting HR review'}";

const line = lines[rowIdx];
const count = line.split(OLD).length - 1;
if (count !== 1) {
  console.error(`ABORT: expected exactly 1 occurrence of target fragment, found ${count}.`);
  process.exit(1);
}

lines[rowIdx] = line.replace(OLD, NEW);
writeFileSync(FILE, lines.join('\n'), 'utf8');
console.log(`OK: row at line ${rowIdx + 1} patched — fallback label is now status-aware.`);
