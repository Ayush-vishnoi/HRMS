import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle line comments
    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      current += char;
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        current += '*/';
        i++;
        continue;
      }
      current += char;
      continue;
    }

    if (!inString && !inDollarQuote) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        current += '--';
        i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        current += '/*';
        i++;
        continue;
      }
    }

    // Handle standard single-quote strings
    if (char === "'" && !inDollarQuote) {
      if (inString && nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += char;
      continue;
    }

    // Semicolon outside strings/comments
    if (char === ';' && !inString && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function runSql() {
  try {
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.sql'), 'utf-8');
    const schemaStmts = splitStatements(schemaSql);
    console.log(`Executing ${schemaStmts.length} schema statements...`);

    for (let i = 0; i < schemaStmts.length; i++) {
      const stmt = schemaStmts[i];
      try {
        await db.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`Error on schema stmt ${i + 1}:`, stmt.substring(0, 80), err);
        throw err;
      }
    }
    console.log('All schema statements executed successfully.');

    const seedSql = fs.readFileSync(path.join(process.cwd(), 'prisma', 'seed.sql'), 'utf-8');
    const seedStmts = splitStatements(seedSql);
    console.log(`Executing ${seedStmts.length} seed statements...`);

    for (let i = 0; i < seedStmts.length; i++) {
      const stmt = seedStmts[i];
      try {
        await db.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`Error on seed stmt ${i + 1}:`, stmt.substring(0, 80), err);
        throw err;
      }
    }
    console.log('All seed statements executed successfully.');
  } catch (err) {
    console.error('Fatal execution error:', err);
  } finally {
    await db.$disconnect();
  }
}

runSql();
