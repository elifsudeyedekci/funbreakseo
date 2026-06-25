import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(
    @CurrentUser() user: User,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notificationService.getNotifications(user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationService.markRead(id, user.id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationService.markAllRead(user.id);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: User) {
    return this.notificationService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.notificationService.updatePreferences(user.id, body);
  }

  @Post('unsubscribe-marketing')
  unsubscribeMarketing(@CurrentUser() user: User) {
    return this.notificationService.unsubscribeMarketing(user.id);
  }
}
