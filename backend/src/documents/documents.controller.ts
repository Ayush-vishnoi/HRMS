import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('employeeId') employeeId?: string) {
    return this.documentsService.findAll(user.id, user.userRole === 'admin', employeeId);
  }

  @Post()
  async handle(@Body() body: any, @CurrentUser() user: any) {
    if (body.action === 'request') return this.documentsService.createRequest(user.id, body);
    return this.documentsService.uploadDocument(user.id, body);
  }
}
