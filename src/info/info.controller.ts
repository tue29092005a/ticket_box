import { Controller, Get, Param } from '@nestjs/common';
import { InfoService } from './info.service';

@Controller('info')
export class InfoController {
  constructor(private readonly infoService: InfoService) {}

  @Get('shows')
  async getAllShows() {
    return await this.infoService.getAllShows();
  }

  @Get('show/:id')
  async getShowInfo(@Param('id') concert_id: string) {
    return await this.infoService.getShowInfo(Number(concert_id));
  }
}
