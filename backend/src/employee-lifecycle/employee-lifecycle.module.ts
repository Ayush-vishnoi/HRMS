import { Module } from '@nestjs/common';
import { EmployeeLifecycleService } from './employee-lifecycle.service';
import { EmployeeLifecycleController } from './employee-lifecycle.controller';

@Module({ providers: [EmployeeLifecycleService], controllers: [EmployeeLifecycleController] })
export class EmployeeLifecycleModule {}
