import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async getReports(
    @Query('genset_id', ParseIntPipe) gensetId: number,
    @Query('days', ParseIntPipe) days: number,
  ) {
    return this.reportService.getReports(gensetId, days);
  }

@Get('load-distribution/:gensetId')
getLoadDistribution(
  @Param('gensetId', ParseIntPipe) gensetId: number,
) {
  return this.reportService.getLoadDistribution(gensetId);
}

@Get('load-distribution')
getOverallLoadDistribution() {
  return this.reportService.getOverallLoadDistribution();
}
}