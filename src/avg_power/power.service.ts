import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PowerController } from './power.controller';

@Injectable()
export class PowerService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // async getHourlyAverage(gensetId: number) {
  //   return this.dataSource.query(
  //     `
  //     SELECT
  //       EXTRACT(HOUR FROM timestamp) AS hour,
  //       ROUND(AVG(power), 2) AS "avgPower"
  //     FROM power_logs
  //     WHERE genset_id = $1
  //     GROUP BY hour
  //     ORDER BY hour
  //     `,
  //     [gensetId],
  //   );
  // }
}


