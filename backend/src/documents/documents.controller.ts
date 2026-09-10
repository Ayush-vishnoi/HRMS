import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express/multer';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import type { UploadedDocumentFile } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  /** GET /api/documents — role-scoped documents, requests, templates, staff. */
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.documentsService.findAll(user.id, user.userRole);
  }

  /**
   * POST /api/documents/upload — multipart form-data with a `file` field.
   * Optional text fields: name, type, requestId (responding to an HR request).
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@CurrentUser('id') userId: string, @Body() body: any, @UploadedFile() file?: UploadedDocumentFile) {
    return this.documentsService.upload(userId, body, file);
  }

  /** POST /api/documents/request — employee asks HR for a document. */
  @Post('request')
  createRequest(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.documentsService.createRequest(userId, body);
  }

  /** POST /api/documents/hr-request — admin asks an employee for a document. */
  @Post('hr-request')
  hrCreateRequest(@CurrentUser() user: any, @Body() body: any) {
    return this.documentsService.hrCreateRequest(user, body);
  }

  /** POST /api/documents/review — admin verifies or rejects an uploaded document. */
  @Post('review')
  review(@CurrentUser() user: any, @Body() body: any) {
    return this.documentsService.review(user, body);
  }

  /** POST /api/documents/fulfil — admin responds to an employee request with files. */
  @Post('fulfil')
  @UseInterceptors(FilesInterceptor('files'))
  fulfil(@CurrentUser() user: any, @Body() body: any, @UploadedFiles() files?: UploadedDocumentFile[]) {
    return this.documentsService.fulfil(user, body, files ?? []);
  }

  /** POST /api/documents/share — admin shares a document with its employee. */
  @Post('share')
  share(@CurrentUser() user: any, @Body() body: any) {
    return this.documentsService.share(user, body);
  }

  /** GET /api/documents/:id/download — stream the stored file (access scoped). */
  @Get(':id/download')
  async download(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const { buffer, mimeType, filename } = await this.documentsService.getDocument(user, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
    return res;
  }
}
