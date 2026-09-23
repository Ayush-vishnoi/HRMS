import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

/**
 * Global so any feature module can inject PermissionsService to gate a
 * CEO-only capability (onboarding approval, immediate termination) without
 * re-importing.
 */
@Global()
@Module({
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
