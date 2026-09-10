import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('session')
  @UseGuards(AuthGuard('jwt'))
  getSession(@CurrentUser('id') userId: string) {
    return this.authService.getSession(userId);
  }

  /** Forced first-login password reset (mustChangePassword onboarding flow). */
  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.authService.changePassword(userId, body);
  }
}
