import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const RECEIPTS_DIR = join(process.cwd(), 'uploads', 'receipts');

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * GET /api/uploads/receipts/:filename — serves expense receipts written by
 * POST /api/expenses/upload. The frontend opens receiptUrl in a new tab
 * (anchor with target="_blank"), so this streams the stored file.
 */
@Controller('uploads/receipts')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  @Get(':filename')
  @Header('Cache-Control', 'private, max-age=3600')
  serveReceipt(@Param('filename') filename: string, @Res() res: Response) {
    // basename() neutralizes any path traversal in the param.
    const safeName = basename(filename);
    const filePath = join(RECEIPTS_DIR, safeName);

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new NotFoundException('Receipt not found.');
    }

    const contentType = MIME_BY_EXT[safeName.slice(safeName.lastIndexOf('.')).toLowerCase()];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const stat = statSync(filePath);
    res.setHeader('Content-Length', stat.size);

    const stream = createReadStream(filePath);
    stream.pipe(res);
    return res;
  }
}
