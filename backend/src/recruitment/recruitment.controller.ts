import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecruitmentService } from './recruitment.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('recruitment')
@UseGuards(AuthGuard('jwt'))
export class RecruitmentController {
  constructor(private recruitmentService: RecruitmentService) {}

  @Get()
  findAll() { return this.recruitmentService.findAll(); }

  @Get('jobs')
  getJobs(@Query('status') status?: string) { return this.recruitmentService.getJobs(status); }

  @Post('jobs')
  createJob(@Body() body: any) { return this.recruitmentService.createJob(body); }

  @Get('candidates')
  getCandidates(@Query('jobId') jobId?: string, @Query('stage') stage?: string) {
    return this.recruitmentService.getCandidates(jobId, stage);
  }

  @Patch('candidates/:id/stage')
  updateStage(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recruitmentService.updateCandidateStage(id, body.stage, user.id, body.note);
  }
}
