import {
  Controller, Post, Put, Get, Delete, Param, Body, Query, UseGuards, Request,
  UploadedFile, UseInterceptors, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventService } from './event.service';
import { SaveStep1Dto } from './dto/save-step1.dto';
import { SaveStep2Dto } from './dto/save-step2.dto';
import { SaveStep3Dto } from './dto/save-step3.dto';
import { SaveStep4Dto } from './dto/save-step4.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('api')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('organizer/concerts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDraft(@Request() req: any) {
    return this.eventService.createDraft(req.user.userId);
  }

  @Put('organizer/concerts/:id/step/1')
  @UseGuards(JwtAuthGuard)
  async saveStep1(@Param('id') eventId: string, @Body() body: SaveStep1Dto, @Request() req: any) {
    return this.eventService.saveStep(eventId, 1, body, req.user.userId);
  }

  @Put('organizer/concerts/:id/step/2')
  @UseGuards(JwtAuthGuard)
  async saveStep2(@Param('id') eventId: string, @Body() body: SaveStep2Dto, @Request() req: any) {
    return this.eventService.saveStep(eventId, 2, body, req.user.userId);
  }

  @Put('organizer/concerts/:id/step/3')
  @UseGuards(JwtAuthGuard)
  async saveStep3(@Param('id') eventId: string, @Body() body: SaveStep3Dto, @Request() req: any) {
    return this.eventService.saveStep(eventId, 3, body, req.user.userId);
  }

  @Put('organizer/concerts/:id/step/4')
  @UseGuards(JwtAuthGuard)
  async saveStep4(@Param('id') eventId: string, @Body() body: SaveStep4Dto, @Request() req: any) {
    return this.eventService.saveStep(eventId, 4, body, req.user.userId);
  }

  @Get('organizer/concerts/:id/draft')
  @UseGuards(JwtAuthGuard)
  async getDraft(@Param('id') eventId: string, @Request() req: any) {
    return this.eventService.getDraft(eventId, req.user.userId);
  }

  @Post('organizer/concerts/:id/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadImage(@Param('id') eventId: string, @UploadedFile() file: Express.Multer.File, @Body('type') type: string) {
    return this.eventService.saveImageFile(eventId, file, type);
  }

  @Get('concerts')
  async listEvents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.eventService.getEventList(page, limit);
  }

  @Get('concerts/:id')
  async getEventDetail(@Param('id') eventId: string) {
    return this.eventService.getEventDetail(eventId);
  }

  @Put('admin/concerts/:id')
  @UseGuards(JwtAuthGuard)
  async updateEvent(@Param('id') eventId: string, @Body() body: UpdateEventDto, @Request() req: any) {
    return this.eventService.updateEvent(eventId, body, req.user.userId);
  }

  @Delete('admin/concerts/:id')
  @UseGuards(JwtAuthGuard)
  async cancelEvent(@Param('id') eventId: string) {
    return this.eventService.cancelEvent(eventId);
  }

  @Put('internal/concerts/:id/seat-counts/:zone')
  async updateGASeatCounts(@Param('id') eventId: string, @Param('zone') zone: string, @Body() body: { available: number; reserved: number; sold: number }) {
    return this.eventService.updateGASeatCounts(eventId, zone, body.available, body.reserved, body.sold);
  }
}
