import pool from '../db/pool';
import { Job } from '../types';

export class JobModel {
  static async create(data: Omit<Job, 'id'>): Promise<Job> {
    const { customerId, serviceType, location, scheduledDate, duration, priority, status, requiredSkills, notes } = data;
    const result = await pool.query(
      `INSERT INTO jobs (customer_id, service_type, location, address, scheduled_date, duration, priority, status, required_skills, notes)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10, $11)
       RETURNING *,
         ST_Y(location::geometry) as lat,
         ST_X(location::geometry) as lng`,
      [customerId, serviceType, location.longitude, location.latitude, location.address, scheduledDate, duration, priority, status, requiredSkills, notes]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findAll(): Promise<Job[]> {
    const result = await pool.query(`
      SELECT *,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      FROM jobs
      ORDER BY scheduled_date ASC
    `);
    return result.rows.map(this.mapRow);
  }

  static async findById(id: string): Promise<Job | null> {
    const result = await pool.query(`
      SELECT *,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      FROM jobs
      WHERE id = $1
    `, [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async update(id: string, data: Partial<Job>): Promise<Job | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status) { fields.push(`status = $${paramCount++}`); values.push(data.status); }
    if (data.assignedTechnicianId) { fields.push(`assigned_technician_id = $${paramCount++}`); values.push(data.assignedTechnicianId); }
    if (data.priority !== undefined) { fields.push(`priority = $${paramCount++}`); values.push(data.priority); }
    if (data.notes) { fields.push(`notes = $${paramCount++}`); values.push(data.notes); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE jobs SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *,
         ST_Y(location::geometry) as lat,
         ST_X(location::geometry) as lng`,
      values
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private static mapRow(row: any): Job {
    return {
      id: row.id,
      customerId: row.customer_id,
      serviceType: row.service_type,
      location: {
        latitude: row.lat || 0,
        longitude: row.lng || 0,
        address: row.address
      },
      scheduledDate: row.scheduled_date,
      duration: row.duration,
      priority: row.priority,
      status: row.status,
      assignedTechnicianId: row.assigned_technician_id,
      requiredSkills: row.required_skills || [],
      notes: row.notes
    };
  }
}
