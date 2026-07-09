// src/genset/genset.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import pool from '../lib/db';
import { EventEmitter2 } from '@nestjs/event-emitter';  

@Injectable()
export class GensetService {

  constructor(private eventEmitter: EventEmitter2) {}

  private readonly allowedColumns = [
    'genset1Status', 'genset2Status', 'genset3Status', 'genset4Status',
    'genset5Status', 'genset6Status', 'genset7Status', 'genset8Status',

    'genset1LastTurnedOn', 'genset2LastTurnedOn', 'genset3LastTurnedOn', 'genset4LastTurnedOn',
    'genset5LastTurnedOn', 'genset6LastTurnedOn', 'genset7LastTurnedOn', 'genset8LastTurnedOn',

    'genset1LastTurnedOff', 'genset2LastTurnedOff', 'genset3LastTurnedOff', 'genset4LastTurnedOff',
    'genset5LastTurnedOff', 'genset6LastTurnedOff', 'genset7LastTurnedOff', 'genset8LastTurnedOff',

    'genset12Status', 'genset12LastTurnedOn', 'genset12LastTurnedOff',
  ];

  async updateStatus({ gensetKey, status }: { gensetKey: string; status: boolean }) {
    if (!gensetKey || typeof status !== 'boolean') {
      throw new BadRequestException('Invalid input');
    }

    const statusColumn = `${gensetKey}Status`;
    const lastOnColumn = `${gensetKey}LastTurnedOn`;
    const lastOffColumn = `${gensetKey}LastTurnedOff`;

    if (!this.allowedColumns.includes(statusColumn)) {
      throw new BadRequestException('Invalid genset column');
    }

    let query = '';
    let values: any[] = [];

    if (gensetKey === 'genset12') {
      // Master toggle - currently affects genset 1 & 2 (keeping existing behavior)
      query = `
        UPDATE status
        SET
          "genset12Status" = $1,
          "genset1Status" = $1,
          "genset2Status" = $1,
          "genset1LastTurned${status ? 'On' : 'Off'}" = NOW(),
          "genset2LastTurned${status ? 'On' : 'Off'}" = NOW()
        WHERE id = 1;
      `;
      values = [status];
    } else {
      query = `
        UPDATE status
        SET
          "${statusColumn}" = $1,
          "${status ? lastOnColumn : lastOffColumn}" = NOW()
        WHERE id = 1;
      `;
      values = [status];
    }

    try {
      // 1. Update requested genset
      await pool.query(query, values);

      // 2. Recalculate MASTER status (only genset1 & genset2 as per existing logic)
      await pool.query(`
        UPDATE status
        SET "genset12Status" =
          CASE
            WHEN "genset1Status" OR "genset2Status"
            THEN true
            ELSE false
          END
        WHERE id = 1;
      `);

      // 3. Return updated row
      const updated = await pool.query(`SELECT * FROM status WHERE id = 1`);

      // 4. Emit events ONLY if master toggle (genset12) was updated
      if (gensetKey === 'genset12') {
        console.log('Master toggle updated - emitting event for genset1 & genset2');

        this.eventEmitter.emit('toggle.genset', { genset: 'genset1', status });
        this.eventEmitter.emit('toggle.genset', { genset: 'genset2', status });
      }

      return {
        message: 'Status updated successfully',
        data: updated.rows[0],
      };
    } catch (error) {
      console.error('❌ UPDATE ERROR:', error);
      throw new BadRequestException('Internal server error');
    }
  }

  async getLastAlerts(gensetId: number) {
    const result = await pool.query(`
      SELECT 
        ah.id,
        ah.genset_id,
        ah.fault_code_id,
        ah.time,
        ah.status,
        fc.description
      FROM public.alert_history ah
      LEFT JOIN public.fault_codes fc ON ah.fault_code_id = fc.fault_code_id
      WHERE ah.genset_id = $1
      ORDER BY ah.time DESC
      LIMIT 5
    `, [gensetId]);

    return result.rows;
  }

  async saveKwReading(gensetId: number, kwValue: number) {
    try {
      const result = await pool.query(`
        INSERT INTO kw_readings (genset_id, kw_value, reading_time)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [gensetId, kwValue]);

      console.log(`Saved KW reading for genset${gensetId}: ${kwValue}`);
      return result.rows[0];
    } catch (err) {
      console.error('Failed to save KW reading:', err);
    }
  }

  async getGraphData(gensetId: number, range: 'today' | '10days') {
    let timeFilter = '';
    let groupByExpr = '';

    if (range === 'today') {
      timeFilter = `reading_time >= NOW() - INTERVAL '24 hours'`;
      groupByExpr = `date_trunc('minute', reading_time)`;
    } else {
      timeFilter = `reading_time >= NOW() - INTERVAL '10 days'`;
      groupByExpr = `date_trunc('hour', reading_time)`;
    }

    try {
      const result = await pool.query(`
        SELECT 
          ${groupByExpr} AS time,
          AVG(kw_value) AS avg_kw
        FROM kw_readings
        WHERE ${timeFilter}
          AND genset_id = $1
        GROUP BY time
        ORDER BY time ASC
      `, [gensetId]);

      return result.rows.map(row => ({
        timestamp: row.time.toISOString(),
        kw: Number(row.avg_kw).toFixed(2)
      }));
    } catch (err) {
      console.error('Graph data query failed:', err);
      return [];
    }
  }

  // home page graph
  async getHourlyAverage(range: 'today' | '30days') {
    let timeFilter = '';
    let groupByExpr = '';

    if (range === 'today') {
      timeFilter = `reading_time >= NOW() - INTERVAL '24 hours'`;
      groupByExpr = `date_trunc('hour', reading_time)`;
    } else {
      timeFilter = `reading_time >= NOW() - INTERVAL '30 days'`;
      groupByExpr = `date_trunc('day', reading_time)`;
    }

    try {
      const result = await pool.query(`
        SELECT 
          ${groupByExpr} AS time,
          SUM(kw_value) AS total_kw
        FROM kw_readings
        WHERE ${timeFilter}
          AND genset_id IN (1, 2, 3, 4, 5, 6, 7, 8)
        GROUP BY time
        ORDER BY time ASC
      `);

      return result.rows.map(row => ({
        timestamp: row.time.toISOString(),
        avgKw: Number(row.total_kw).toFixed(2)
      }));
    } catch (err) {
      console.error('Hourly average query failed:', err);
      return [];
    }
  }

  async getWeekly30DaysGraph(gensetId: number) {
    try {
      const result = await pool.query(`
        SELECT 
          date_trunc('week', reading_time) AS week_start,
          AVG(kw_value) AS avg_kw
        FROM kw_readings
        WHERE reading_time >= NOW() - INTERVAL '30 days'
          AND genset_id = $1
        GROUP BY week_start
        ORDER BY week_start ASC
      `, [gensetId]);

      return result.rows.map((row, index) => ({
        week: `Week ${index + 1}`,
        avgKw: Number(row.avg_kw).toFixed(2)
      }));
    } catch (err) {
      console.error('30 days weekly graph query failed:', err);
      return [];
    }
  }

  async getDaily10DaysGraph(gensetId: number) {
    try {
      const result = await pool.query(`
        SELECT 
          date_trunc('day', reading_time) AS day_start,
          AVG(kw_value) AS avg_kw
        FROM kw_readings
        WHERE reading_time >= NOW() - INTERVAL '10 days'
          AND genset_id = $1
        GROUP BY day_start
        ORDER BY day_start ASC
      `, [gensetId]);

      return result.rows.map((row, index) => ({
        day: `Day ${index + 1}`,
        avgKw: Number(row.avg_kw).toFixed(2)
      }));
    } catch (err) {
      console.error('10 days daily graph query failed:', err);
      return [];
    }
  }
}