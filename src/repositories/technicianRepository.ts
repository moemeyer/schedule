import { Technician } from '../types';
import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export class TechnicianRepository {
  async create(technician: Omit<Technician, 'id' | 'createdAt' | 'updatedAt'>): Promise<Technician> {
    const query = `
      INSERT INTO technicians (
        id, name, email, phone, skills, home_location, home_address,
        available_hours, max_jobs_per_day, active
      ) VALUES ($1, $2, $3, $4, $5, ST_GeogFromText($6), $7, $8, $9, $10)
      RETURNING
        id, name, email, phone, skills,
        ST_Y(home_location::geometry) as home_latitude,
        ST_X(home_location::geometry) as home_longitude,
        home_address, available_hours, max_jobs_per_day, active,
        ST_Y(current_location::geometry) as current_latitude,
        ST_X(current_location::geometry) as current_longitude,
        created_at, updated_at
    `;

    const id = uuidv4();
    const result = await db.query(query, [
      id,
      technician.name,
      technician.email,
      technician.phone,
      JSON.stringify(technician.skills),
      `POINT(${technician.homeLocation.longitude} ${technician.homeLocation.latitude})`,
      technician.homeLocation.address,
      JSON.stringify(technician.availableHours),
      technician.maxJobsPerDay,
      technician.active,
    ]);

    return this.mapRowToTechnician(result.rows[0]);
  }

  async findById(id: string): Promise<Technician | null> {
    const query = `
      SELECT
        id, name, email, phone, skills,
        ST_Y(home_location::geometry) as home_latitude,
        ST_X(home_location::geometry) as home_longitude,
        home_address, available_hours, max_jobs_per_day, active,
        ST_Y(current_location::geometry) as current_latitude,
        ST_X(current_location::geometry) as current_longitude,
        created_at, updated_at
      FROM technicians
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTechnician(result.rows[0]);
  }

  async findAll(activeOnly: boolean = false): Promise<Technician[]> {
    let query = `
      SELECT
        id, name, email, phone, skills,
        ST_Y(home_location::geometry) as home_latitude,
        ST_X(home_location::geometry) as home_longitude,
        home_address, available_hours, max_jobs_per_day, active,
        ST_Y(current_location::geometry) as current_latitude,
        ST_X(current_location::geometry) as current_longitude,
        created_at, updated_at
      FROM technicians
    `;

    if (activeOnly) {
      query += ' WHERE active = true';
    }

    query += ' ORDER BY name ASC';

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToTechnician(row));
  }

  async update(id: string, updates: Partial<Technician>): Promise<Technician | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount}`);
      params.push(updates.name);
      paramCount++;
    }

    if (updates.email) {
      fields.push(`email = $${paramCount}`);
      params.push(updates.email);
      paramCount++;
    }

    if (updates.phone) {
      fields.push(`phone = $${paramCount}`);
      params.push(updates.phone);
      paramCount++;
    }

    if (updates.skills) {
      fields.push(`skills = $${paramCount}`);
      params.push(JSON.stringify(updates.skills));
      paramCount++;
    }

    if (updates.active !== undefined) {
      fields.push(`active = $${paramCount}`);
      params.push(updates.active);
      paramCount++;
    }

    if (updates.currentLocation) {
      fields.push(`current_location = ST_GeogFromText($${paramCount})`);
      params.push(`POINT(${updates.currentLocation.longitude} ${updates.currentLocation.latitude})`);
      paramCount++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const query = `
      UPDATE technicians
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id, name, email, phone, skills,
        ST_Y(home_location::geometry) as home_latitude,
        ST_X(home_location::geometry) as home_longitude,
        home_address, available_hours, max_jobs_per_day, active,
        ST_Y(current_location::geometry) as current_latitude,
        ST_X(current_location::geometry) as current_longitude,
        created_at, updated_at
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTechnician(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM technicians WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToTechnician(row: any): Technician {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      skills: row.skills,
      homeLocation: {
        latitude: parseFloat(row.home_latitude),
        longitude: parseFloat(row.home_longitude),
        address: row.home_address,
      },
      availableHours: row.available_hours,
      maxJobsPerDay: row.max_jobs_per_day,
      active: row.active,
      currentLocation: row.current_latitude && row.current_longitude
        ? {
            latitude: parseFloat(row.current_latitude),
            longitude: parseFloat(row.current_longitude),
          }
        : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new TechnicianRepository();
