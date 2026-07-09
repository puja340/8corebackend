import { Controller, Get, Param } from '@nestjs/common';
import { PowerService } from './power.service';

@Controller('power')
export class PowerController {
  constructor(private readonly powerService: PowerService) {}

  // @Get('hourly-average/:gensetId')
  // getHourlyAverage(@Param('gensetId') gensetId: string) {
  //   return this.powerService.getHourlyAverage(Number(gensetId));
  // }
}
