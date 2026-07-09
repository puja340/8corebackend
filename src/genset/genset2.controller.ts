// src/genset/genset.controller.ts
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { GensetService } from './genset.service';
import pool from 'src/lib/db';

@Controller('api/genset')
export class GensetController {
  constructor(private readonly gensetService: GensetService) {}

  /* =====================
     TEST ENDPOINT
     ===================== */
  @Get('test')
  test() {
    console.log('>>> /test route called');
    return { message: 'API route is working from NestJS!', time: new Date() };
  }

  /* =====================
     UPDATE GENSET STATUS
     ===================== */
  @Post('updateStatus')
  async updateStatus(
    @Body() body: { gensetKey: string; status: boolean },
  ) {
    console.log('>>> updateStatus called with body:', body);
    return this.gensetService.updateStatus(body);
  }

  /* =====================
     GET MASTER STATUS (All 8 Gensets)
     ===================== */
  @Get('getMasterStatus')
  async getMasterStatus() {
    const result = await pool.query(`
      SELECT
        "genset1Status",
        "genset2Status",
        "genset3Status",
        "genset4Status",
        "genset5Status",
        "genset6Status",
        "genset7Status",
        "genset8Status",
        "genset12Status"
      FROM status
      WHERE id = 1
    `);

    return result.rows[0];
  }

  /* =====================
     ALERTS & GRAPHS (Unchanged)
     ===================== */
  @Get('alerts/:gensetId')
  async getLastAlerts(@Param('gensetId') gensetId: number) {
    return this.gensetService.getLastAlerts(gensetId);
  }

  @Get('graph/:gensetId')
  async getGraphData(
    @Param('gensetId') gensetId: number,
    @Query('range') range: 'today' | '10days' = 'today',
  ) {
    return this.gensetService.getGraphData(gensetId, range);
  }

  // home page graph
  @Get('hourly-average')
  async getHourlyAverage(
    @Query('range') range: 'today' | '30days' = 'today',
  ) {
    return this.gensetService.getHourlyAverage(range);
  }

  @Get('graph/weekly-30days/:gensetId')
  async getWeekly30DaysGraph(@Param('gensetId') gensetId: number) {
    return this.gensetService.getWeekly30DaysGraph(gensetId);
  }

  @Get('graph/daily-10days/:gensetId')
  async getDaily10DaysGraph(@Param('gensetId') gensetId: number) {
    return this.gensetService.getDaily10DaysGraph(gensetId);
  }
}