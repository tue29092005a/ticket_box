import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: string) {
    if (!q) return [];
    return this.searchService.searchShows(q);
  }

  @Post('admin/sync')
  async syncAdminData(@Body() body: any) {
    await this.searchService.syncAdminData(body);
    return { success: true };
  }
}
