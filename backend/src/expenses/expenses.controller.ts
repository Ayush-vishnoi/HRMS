import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ExpensesService } from './expenses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** Mirrors the frontend ALLOWED_RECEIPT_TYPES set (src/app/expenses/page.tsx). */
const ALLOWED_RECEIPT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB — matches frontend MAX_RECEIPT_SIZE

const receiptStorage = diskStorage({
  destination: './uploads/receipts',
  filename: (_req, file, cb) => {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

/** Minimal stand-in for Express.Multer.File (@types/multer is not installed). */
interface UploadedReceiptFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('view') view = 'my', @Query('employeeId') employeeId?: string) {
    return this.expensesService.findAll(user.id, user.userRole, view, employeeId);
  }

  /**
   * POST /api/expenses/upload — multipart form-data with a `receipt` file field.
   * Frontend (handleSubmitClaim) expects { success, data: { receiptUrl } }.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('receipt', { storage: receiptStorage }))
  uploadReceipt(
    @CurrentUser() user: any,
    @UploadedFile() file?: UploadedReceiptFile,
  ) {
    if (!file) {
      throw new BadRequestException('A receipt file is required.');
    }
    if (!ALLOWED_RECEIPT_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, PNG, and WEBP receipts are supported.');
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      throw new BadRequestException('Receipt must be 10 MB or smaller.');
    }
    return { receiptUrl: `/api/uploads/receipts/${file.filename}`, uploadedBy: user.id };
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.expensesService.create(body.employeeId || user.id, body);
  }

  @Patch()
  update(@Body() body: any) {
    const { id, ...data } = body;
    return this.expensesService.update(id, data);
  }
}
