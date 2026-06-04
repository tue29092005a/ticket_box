import { Controller, Get, Param } from '@nestjs/common';
import { InfoService } from './info.service';

@Controller('info')
export class InfoController {
  constructor(private readonly infoService: InfoService) {}

  @Get('show/:id')
  async getShowInfo(@Param('id') showId: string) {
    return await this.infoService.getShowInfo(showId);
  }
}
