import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

export interface ExtractedDocument {
  text: string;
  fileHash: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  fileName: string;
  storagePath: string;
}

/**
 * Safely parses PDF buffer in Node/Next.js environment
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    if (typeof globalThis.DOMMatrix === 'undefined') {
      (globalThis as any).DOMMatrix = class DOMMatrix {};
    }
    if (typeof globalThis.ImageData === 'undefined') {
      (globalThis as any).ImageData = class ImageData {};
    }
    if (typeof globalThis.Path2D === 'undefined') {
      (globalThis as any).Path2D = class Path2D {};
    }

    // Dynamic require inside function
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err: any) {
    // Fallback: extract text streams from PDF buffer
    const rawStr = buffer.toString('utf-8');
    const textMatches = rawStr.match(/\(([^\(\)\\]+)\)[\s]*Tj/g);
    if (textMatches && textMatches.length > 0) {
      return textMatches.map((m) => m.replace(/^\(|\)[\s]*Tj$/g, '')).join(' ');
    }
    return rawStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const STORAGE_DIR = path.join(process.cwd(), 'uploads', 'resumes');

/**
 * Validates untrusted file buffers and file names
 */
export function validateResumeFile(fileName: string, buffer: Buffer, mimeType?: string): { valid: boolean; error?: string; extension: string } {
  if (!fileName || !buffer) {
    return { valid: false, error: 'File name and file content are required.', extension: '' };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file format "${ext}". Allowed formats are PDF (.pdf), Word (.docx), and Plain Text (.txt).`,
      extension: ext,
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10MB limit (uploaded: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
      extension: ext,
    };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty (0 bytes).', extension: ext };
  }

  return { valid: true, extension: ext };
}

/**
 * Computes a secure SHA-256 hash of a file buffer for deduplication fingerprinting
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extracts raw normalized text from PDF, DOCX, or TXT file buffers
 */
export async function extractResumeText(
  fileName: string,
  buffer: Buffer,
  candidateId: string
): Promise<ExtractedDocument> {
  const validation = validateResumeFile(fileName, buffer);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid resume file.');
  }

  const fileHash = computeFileHash(buffer);
  const ext = validation.extension;
  let text = '';
  let fileType: 'pdf' | 'docx' | 'txt' = 'txt';

  if (ext === '.pdf') {
    fileType = 'pdf';
    text = await parsePdfBuffer(buffer);
  } else if (ext === '.docx') {
    fileType = 'docx';
    try {
      const docxResult = await mammoth.extractRawText({ buffer });
      text = docxResult.value || '';
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message}`);
    }
  } else if (ext === '.txt') {
    fileType = 'txt';
    text = buffer.toString('utf-8');
  }

  // Normalize extracted text
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .trim();

  if (!normalizedText || normalizedText.length < 10) {
    throw new Error('Extracted document text contains insufficient content for parsing.');
  }

  // Ensure storage directory exists and store securely
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const secureFileName = `${candidateId}-${fileHash.slice(0, 12)}${ext}`;
  const storagePath = path.join(STORAGE_DIR, secureFileName);
  await fs.writeFile(storagePath, buffer);

  return {
    text: normalizedText,
    fileHash,
    fileType,
    fileSize: buffer.length,
    fileName,
    storagePath: path.relative(process.cwd(), storagePath).replace(/\\/g, '/'),
  };
}
