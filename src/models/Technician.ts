import pool from '../db/pool';
import { Technician } from '../types';

export class TechnicianModel {
  static async create(data: Omit<Technician, 'id'>): Promise<Technician> {
    const { name, email, phone, skills, skillLevel, currentLocation, status, vehicleId } = data;
    const result = await pool.query(
      `INSERT INTO technicians (name, email, phone, skills, skill_level, current_location, status, vehicle_id)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9)
       RETURNING *,
         ST_Y(current_location::geometry) as lat,
         ST_X(current_location::geometry) as lng`,
      [name, email, phone, skills, skillLevel, currentLocation.longitude, currentLocation.latitude, status, vehicleId]
    );
    return this.mapRow(result.rows[0]);
  }

  static async findAll(): Promise<Technician[]> {
    const result = await pool.query(`
      SELECT *,
        ST_Y(current_location::geometry) as lat,
        ST_X(current_location::geometry) as lng
      FROM technicians
      ORDER BY created_at DESC
    `);
    return result.rows.map(this.mapRow);
  }

  static async findById(id: string): Promise<Technician | null> {
    const result = await pool.query(`
      SELECT *,
        ST_Y(current_location::geometry) as lat,
        ST_X(current_location::geometry) as lng
      FROM technicians
      WHERE id = $1
    `, [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async update(id: string, data: Partial<Technician>): Promise<Technician | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) { fields.push(`name = $${paramCount++}`); values.push(data.name); }
    if (data.email) { fields.push(`email = $${paramCount++}`); values.push(data.email); }
    if (data.phone) { fields.push(`phone = $${paramCount++}`); values.push(data.phone); }
    if (data.skills) { fields.push(`skills = $${paramCount++}`); values.push(data.skills); }
    if (data.skillLevel) { fields.push(`skill_level = $${paramCount++}`); values.push(data.skillLevel); }
    if (data.status) { fields.push(`status = $${paramCount++}`); values.push(data.status); }
    if (data.currentLocation) {
      fields.push(`current_location = ST_SetSRID(ST_MakePoint($${paramCount++}, $${paramCount++}), 4326)`);
      values.push(data.currentLocation.longitude, data.currentLocation.latitude);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE technicians SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *,
         ST_Y(current_location::geometry) as lat,
         ST_X(current_location::geometry) as lng`,
      values
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private static mapRow(row: any): Technician {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      skills: row.skills || [],
      skillLevel: row.skill_level,
      currentLocation: {
        latitude: row.lat || 0,
        longitude: row.lng || 0
      },
      status: row.status,
      vehicleId: row.vehicle_id
    };
  }
}
