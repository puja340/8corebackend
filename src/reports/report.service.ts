import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { MoreThanOrEqual } from 'typeorm';
import { DataSource } from 'typeorm';


@Injectable()
export class ReportService {
constructor(
  @InjectRepository(Report)
  private readonly reportRepository: Repository<Report>,

  private readonly dataSource: DataSource,
) {}

async getReports(gensetId: number, days: number): Promise<any[]> {
  // Today: strictly today's data, grouped hour-wise
  if (days === 1) {
    return this.dataSource.query(
      `
      SELECT
        date_trunc('hour', created_at) AS created_at,
        ROUND(AVG(voltage)::numeric, 2) AS voltage,
        ROUND(AVG(frequency)::numeric, 2) AS frequency,
        ROUND(AVG(running_time)::numeric, 2) AS running_time,
        ROUND(AVG(engine_rpm)::numeric, 2) AS engine_rpm,
        ROUND(AVG(lube_oil)::numeric, 2) AS lube_oil,
        ROUND(AVG(coolant_temp)::numeric, 2) AS coolant_temp
      FROM reports
      WHERE genset_id = $1
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
      GROUP BY date_trunc('hour', created_at)
      ORDER BY created_at DESC;
      `,
      [gensetId],
    );
  }

  // Last 7 days / Last 30 days: keep existing behavior
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  return this.reportRepository.find({
    where: {
      genset_id: gensetId,
      created_at: days ? MoreThanOrEqual(dateLimit) : undefined,
    },
    order: {
      created_at: 'DESC',
    },
  });
}

async getLoadDistribution(gensetId: number) {
  return this.dataSource.query(
    `
    WITH capacity AS (
      SELECT 500.0 AS max_capacity_kw
    ),
    range_data AS (
      SELECT
        CASE
          WHEN kw_value BETWEEN 0 AND (0.2 * c.max_capacity_kw)
            THEN '0-20%'

          WHEN kw_value > (0.2 * c.max_capacity_kw)
            AND kw_value <= (0.4 * c.max_capacity_kw)
            THEN '21-40%'

          WHEN kw_value > (0.4 * c.max_capacity_kw)
            AND kw_value <= (0.6 * c.max_capacity_kw)
            THEN '41-60%'

          WHEN kw_value > (0.6 * c.max_capacity_kw)
            AND kw_value <= (0.8 * c.max_capacity_kw)
            THEN '61-80%'

          WHEN kw_value > (0.8 * c.max_capacity_kw)
            AND kw_value <= c.max_capacity_kw
            THEN '81-100%'
        END AS load_range,
        COUNT(*) AS minutes_in_range
      FROM kw_readings
      CROSS JOIN capacity c
      WHERE genset_id = $1
      GROUP BY load_range
    ),
    total_minutes AS (
      SELECT COUNT(*) AS total_minutes
      FROM kw_readings
      WHERE genset_id = $1
    )
    SELECT
      r.load_range,
      r.minutes_in_range,
      ROUND(
        (r.minutes_in_range::decimal / NULLIF(t.total_minutes, 0)) * 100,
        2
      ) AS percentage
    FROM range_data r
    CROSS JOIN total_minutes t
    WHERE r.load_range IS NOT NULL
    ORDER BY r.load_range;
    `,
    [gensetId],
  );
}


async getOverallLoadDistribution() {
  return this.dataSource.query(`
    WITH capacity AS (
      SELECT 500.0 AS max_capacity_kw
    ),
    range_data AS (
      SELECT
        CASE
          WHEN kw_value BETWEEN 0 AND (0.2 * c.max_capacity_kw)
            THEN '0-20%'

          WHEN kw_value > (0.2 * c.max_capacity_kw)
            AND kw_value <= (0.4 * c.max_capacity_kw)
            THEN '21-40%'

          WHEN kw_value > (0.4 * c.max_capacity_kw)
            AND kw_value <= (0.6 * c.max_capacity_kw)
            THEN '41-60%'

          WHEN kw_value > (0.6 * c.max_capacity_kw)
            AND kw_value <= (0.8 * c.max_capacity_kw)
            THEN '61-80%'

          WHEN kw_value > (0.8 * c.max_capacity_kw)
            AND kw_value <= c.max_capacity_kw
            THEN '81-100%'
        END AS load_range,
        COUNT(*) AS minutes_in_range
      FROM kw_readings
      CROSS JOIN capacity c
      GROUP BY load_range
    ),
    total_minutes AS (
      SELECT COUNT(*) AS total_minutes
      FROM kw_readings
    )
    SELECT
      r.load_range,
      r.minutes_in_range,
      ROUND(
        (r.minutes_in_range::decimal / NULLIF(t.total_minutes, 0)) * 100,
        2
      ) AS percentage
    FROM range_data r
    CROSS JOIN total_minutes t
    WHERE r.load_range IS NOT NULL
    ORDER BY r.load_range;
  `);
}
}