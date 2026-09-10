import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import type { Response } from 'express';
import { RecruitmentService } from './recruitment.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/* ==========================================================================
   RECRUITMENT CONTROLLER — Phase 4C
   Wires every service method to a REST route. The frontend calls these via
   /api/recruitment/* (Next.js rewrites to the Nest backend on :4000).

   Response contract:
   - The global LegacyResponseInterceptor wraps returns in { success, data }
     UNLESS the returned object already has a `success`/`accessToken` key,
     or the handler wrote headers itself via @Res().
   - Endpoints below that spread `{ success: true, ...result }` are read by
     the frontend at the TOP LEVEL (json.matchResult, json.templates, ...).
   - Endpoints returning `{ success: true, data }` are read via json.data.
   ========================================================================== */

/** Mirrors the file types the frontend resume parser accepts. */
const ALLOWED_RESUME_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
]);
const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10 MB

const resumeStorage = diskStorage({
  destination: './uploads/resumes',
  filename: (_req, file, cb) => {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

/** Minimal stand-in for Express.Multer.File (@types/multer not installed). */
interface UploadedResumeFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

@Controller('recruitment')
@UseGuards(AuthGuard('jwt'))
export class RecruitmentController {
  constructor(private recruitmentService: RecruitmentService) {}

  /* ============================================================
     DASHBOARD / JOBS
     ============================================================ */

  /** GET /api/recruitment — aggregate jobs + candidates for the pipeline page. */
  @Get()
  async getDashboard(@Query('jobId') jobId?: string, @Query('stage') stage?: string) {
    const { jobs } = await this.recruitmentService.findAll();
    const candidates = await this.recruitmentService.getCandidates(jobId, stage);
    return { success: true, data: { jobs, candidates } };
  }

  /** GET /api/recruitment/my-approvals — pending job/offer approval steps for the current user. */
  @Get('my-approvals')
  getMyApprovals(@CurrentUser() user: any) {
    return this.recruitmentService.getMyApprovals(user.id);
  }

  /** GET /api/recruitment/jobs */
  @Get('jobs')
  getJobs() {
    return this.recruitmentService.findAll();
  }

  /** POST /api/recruitment/jobs — create a job requisition. Frontend reads json.data.id. */
  @Post('jobs')
  async createJob(@Body() body: any) {
    const job = await this.recruitmentService.createJob(body);
    return { success: true, data: job };
  }

  /** PATCH /api/recruitment/jobs/:id — update + action (submit_approval/publish/hold/close). */
  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateJob(id, body);
  }

  /** POST /api/recruitment/jobs/:id/approvals — APPROVE / REJECT / REQUEST_CHANGES. */
  @Post('jobs/:id/approvals')
  jobApprovalAction(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.jobApprovalAction(id, body, user.id);
  }

  /** GET /api/recruitment/jobs/:id/rediscover?minScore= — top-level rediscoveredCandidates. */
  @Get('jobs/:id/rediscover')
  async rediscover(@Param('id') id: string, @Query('minScore') minScore?: string) {
    const result = await this.recruitmentService.rediscover(id, minScore ? Number(minScore) : undefined);
    return { success: true, ...result };
  }

  /* ============================================================
     CANDIDATES
     ============================================================ */

  /** GET /api/recruitment/candidates?jobId=&stage= */
  @Get('candidates')
  getCandidates(@Query('jobId') jobId?: string, @Query('stage') stage?: string) {
    return this.recruitmentService.getCandidates(jobId, stage);
  }

  /** POST /api/recruitment/candidates — manual add. */
  @Post('candidates')
  createCandidate(@Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.createCandidate({ ...body, createdById: user.id });
  }

  /** GET /api/recruitment/candidates/:id — single candidate detail. */
  @Get('candidates/:id')
  getCandidate(@Param('id') id: string) {
    return this.recruitmentService.getCandidate(id);
  }

  /** PATCH /api/recruitment/candidates/:id — tags, source, etc. */
  @Patch('candidates/:id')
  updateCandidate(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateCandidate(id, body);
  }

  /** POST /api/recruitment/candidates/:id/stage — move pipeline stage. */
  @Post('candidates/:id/stage')
  updateStage(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.updateCandidateStage(id, body.stage, user.id, body.note);
  }

  /** POST /api/recruitment/candidates/:id/selection — SELECT/REJECT/HOLD/NEXT_ROUND. */
  @Post('candidates/:id/selection')
  selectionDecision(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.selectionDecision(id, body, user.id);
  }

  /** POST /api/recruitment/candidates/:id/resume — upload a resume (FormData `file`). */
  @Post('candidates/:id/resume')
  @UseInterceptors(FileInterceptor('file', { storage: resumeStorage }))
  async uploadResume(
    @Param('id') id: string,
    @UploadedFile() file?: UploadedResumeFile,
    @CurrentUser() user: any = {},
  ) {
    if (!file) throw new BadRequestException('A resume file is required (FormData field "file").');
    if (!ALLOWED_RESUME_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, DOCX, RTF and TXT resumes are supported.');
    }
    if (file.size > MAX_RESUME_BYTES) {
      throw new BadRequestException('Resume must be 10 MB or smaller.');
    }
    const result = await this.recruitmentService.uploadResume(id, file, user.id);
    return { success: true, ...result };
  }

  /** GET /api/recruitment/candidates/:id/resume — stream stored resume file (UNGUARDED). */
  @Get('candidates/:id/resume')
  async downloadResume(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName, mimeType } = await this.recruitmentService.getResumeFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.end(buffer);
  }

  /** POST /api/recruitment/candidates/:id/parse-resume — re-parse + recompute match. */
  @Post('candidates/:id/parse-resume')
  async reparseResume(@Param('id') id: string) {
    const result = await this.recruitmentService.reparseResume(id);
    return { success: true, ...result };
  }

  /** POST /api/recruitment/candidates/:id/add-to-job — copy to another job. */
  @Post('candidates/:id/add-to-job')
  addToJob(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.addToJob(id, body.targetJobId);
  }

  /* ============================================================
     RESUME DRAFT PARSING (ResumeReviewQueue)
     ============================================================ */

  /** POST /api/recruitment/candidates/parse-draft — FormData `file`, returns parsedData. */
  @Post('candidates/parse-draft')
  @UseInterceptors(FileInterceptor('file', { storage: resumeStorage }))
  async parseDraft(@UploadedFile() file?: UploadedResumeFile) {
    if (!file) throw new BadRequestException('A resume file is required (FormData field "file").');
    const result = await this.recruitmentService.parseDraft(file);
    return { success: true, ...result };
  }

  /** POST /api/recruitment/candidates/from-resume — FormData `file` + `fields` JSON. */
  @Post('candidates/from-resume')
  @UseInterceptors(FileInterceptor('file', { storage: resumeStorage }))
  async createFromResume(
    @UploadedFile() file?: UploadedResumeFile,
    @Body('fields') fieldsJson?: string,
    @CurrentUser() user: any = {},
  ) {
    if (!file) throw new BadRequestException('A resume file is required (FormData field "file").');
    const result = await this.recruitmentService.createFromResume(file, fieldsJson || '{}', user.id);
    return { success: true, ...result };
  }

  /* ============================================================
     INTERVIEWS
     ============================================================ */

  /** GET /api/recruitment/interviews?candidateId= */
  @Get('interviews')
  getInterviews(@Query('candidateId') candidateId?: string) {
    return this.recruitmentService.getInterviews(candidateId || '');
  }

  /** POST /api/recruitment/interviews — schedule. */
  @Post('interviews')
  createInterview(@Body() body: any) {
    return this.recruitmentService.createInterview(body);
  }

  /** PATCH /api/recruitment/interviews/:id — update or status-only change. */
  @Patch('interviews/:id')
  updateInterview(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateInterview(id, body);
  }

  /** POST /api/recruitment/interviews/:id/feedback — panel member feedback. */
  @Post('interviews/:id/feedback')
  submitFeedback(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.submitFeedback(id, body, user.id);
  }

  /* ============================================================
     NOTES + TIMELINE
     ============================================================ */

  /** GET /api/recruitment/candidates/:id/notes */
  @Get('candidates/:id/notes')
  async getNotes(@Param('id') id: string) {
    const notes = await this.recruitmentService.getNotes(id);
    return { success: true, data: notes };
  }

  /** POST /api/recruitment/candidates/:id/notes — add note, returns created note under data. */
  @Post('candidates/:id/notes')
  async addNote(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const note = await this.recruitmentService.addNote(id, body, user.id);
    return { success: true, data: note };
  }

  /** GET /api/recruitment/candidates/:id/timeline */
  @Get('candidates/:id/timeline')
  async getTimeline(@Param('id') id: string) {
    const timeline = await this.recruitmentService.getTimeline(id);
    return { success: true, data: timeline };
  }

  /* ============================================================
     OFFERS
     ============================================================ */

  /** GET /api/recruitment/offers?candidateId= */
  @Get('offers')
  async getOffers(@Query('candidateId') candidateId?: string, @CurrentUser() user?: any) {
    const offers = await this.recruitmentService.getOffers(candidateId || '', user?.id);
    return { success: true, data: offers };
  }

  /** POST /api/recruitment/offers — create a draft offer. */
  @Post('offers')
  createOffer(@Body() body: any) {
    return this.recruitmentService.createOffer(body);
  }

  /** PATCH /api/recruitment/offers/:id — edit draft offer. */
  @Patch('offers/:id')
  updateOffer(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.updateOffer(id, body);
  }

  /** POST /api/recruitment/offers/:id/submit-approval */
  @Post('offers/:id/submit-approval')
  submitOfferForApproval(@Param('id') id: string, @Body() body: any) {
    return this.recruitmentService.submitOfferForApproval(id, body);
  }

  /** POST /api/recruitment/offers/:id/approvals — APPROVE/REJECT/REQUEST_CHANGES. */
  @Post('offers/:id/approvals')
  offerApprovalAction(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.offerApprovalAction(id, body, user.id);
  }

  /** GET /api/recruitment/offers/:id/documents — templates + documents (top-level). */
  @Get('offers/:id/documents')
  async listOfferDocuments(@Param('id') id: string) {
    const result = await this.recruitmentService.listOfferDocuments(id);
    return { success: true, ...result };
  }

  /** POST /api/recruitment/offers/:id/documents/preview — { documentType, templateId }. */
  @Post('offers/:id/documents/preview')
  async previewOfferDocument(@Param('id') id: string, @Body() body: any) {
    const result = await this.recruitmentService.previewOfferDocument(id, body);
    return { success: true, ...result };
  }

  /** POST /api/recruitment/offers/:id/documents — generate official document. */
  @Post('offers/:id/documents')
  async generateOfferDocument(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const result = await this.recruitmentService.generateOfferDocument(id, body, user);
    return { success: true, ...result };
  }

  /** GET /api/recruitment/offers/:id/documents/:docId — download (UNGUARDED, window.open). */
  @Get('offers/:id/documents/:docId')
  async downloadOfferDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.recruitmentService.downloadOfferDocument(id, docId);
    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.end(buffer);
  }

  /** POST /api/recruitment/offers/:id/send — send to candidate portal. */
  @Post('offers/:id/send')
  async sendOffer(@Param('id') id: string) {
    const portalBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const result = await this.recruitmentService.sendOffer(id, (candidateId: string) => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return {
        url: `${portalBase}/recruitment?candidateId=${encodeURIComponent(candidateId)}`,
        expiresAt,
      };
    });
    return { success: true, ...result };
  }
}
