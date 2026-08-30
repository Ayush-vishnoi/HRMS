import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/app/documents/page.tsx';
const lines = readFileSync(path, 'utf8').split('\n');
const idx = 394; // line 395 (1-based)
let line = lines[idx];

if (!line.includes("document.status === 'Under Review'") || !line.includes('<tr key={document.id}')) {
  console.error('Line 395 does not look like the document submissions row. Aborting without changes.');
  process.exit(1);
}

const pairs = [
  [
    '<td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2">',
    '<td className="px-4 py-3 text-right align-middle"><div className="flex flex-wrap items-center justify-end gap-2">',
    1,
  ],
  [
    "{isAdmin && document.status === 'Under Review' && <><button onClick={() => void reviewDocument(document.id, 'approve')} className=\"rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white\">Verify</button><button onClick={() => void reviewDocument(document.id, 'reject')} className=\"rounded-lg bg-rose-600 px-2.5 py-2 text-[10px] font-bold text-white\">Return</button></>}",
    "{isAdmin && document.status === 'Under Review' && <button onClick={() => { setReviewDoc(document); setReviewDecision('verify'); setReviewReason(''); }} className=\"inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#17324A] px-2.5 py-2 text-[10px] font-bold text-white hover:bg-[#244A68]\"><FileSearch className=\"h-3.5 w-3.5\" /> Review</button>}",
    1,
  ],
  [
    'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700',
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700',
    1,
  ],
  [
    'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700',
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700',
    1,
  ],
  [
    'inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700',
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700',
    2,
  ],
  [
    'inline-flex items-center gap-1 rounded-lg border border-[#9FC2DC] px-2.5 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]',
    'inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#9FC2DC] px-2.5 py-2 text-[10px] font-bold text-[#17324A] hover:bg-[#EAF2F8]',
    1,
  ],
  [
    'className="rounded-lg bg-cyan-700 px-2.5 py-2 text-[10px] font-bold text-white"',
    'className="whitespace-nowrap rounded-lg bg-cyan-700 px-2.5 py-2 text-[10px] font-bold text-white"',
    1,
  ],
  [
    'rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[document.status]}',
    'rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${statusStyle[document.status]}',
    1,
  ],
];

for (const [find, replace, expected] of pairs) {
  const count = line.split(find).length - 1;
  if (count !== expected) {
    console.error(`ABORT: expected ${expected} occurrence(s), found ${count} for: ${find.slice(0, 90)}...`);
    process.exit(1);
  }
  line = line.split(find).join(replace);
}

lines[idx] = line;
writeFileSync(path, lines.join('\n'));
console.log('OK: line 395 patched.');
console.log('Review button present:', line.includes('>Review</button>'));
console.log('Old Verify/Return calls gone:', !line.includes('reviewDocument(document.id'));
console.log('align-middle present:', line.includes('text-right align-middle'));
