import { Job, JobStatus, Location } from '../types';
import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export class JobRepository {
  async create(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const query = `
      INSERT INTO jobs (
        id, customer_id, service_type, location, address,
        estimated_duration_minutes, priority, time_window_start, time_window_end,
        required_skills, required_equipment, notes, status
      ) VALUES ($1, $2, $3, ST_GeogFromText($4), $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id, customer_id, service_type,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        address, estimated_duration_minutes, priority,
        time_window_start, time_window_end, required_skills, required_equipment,
        notes, status, assigned_technician_id, assigned_route_id,
        scheduled_time, completed_time, created_at, updated_at
    `;

    const id = uuidv4();
    const result = await db.query(query, [
      id,
      job.customerId,
      job.serviceType,
      `POINT(${job.location.longitude} ${job.location.latitude})`,
      job.location.address,
      job.estimatedDurationMinutes,
      job.priority,
      job.timeWindow?.start,
      job.timeWindow?.end,
      JSON.stringify(job.requiredSkills),
      JSON.stringify(job.requiredEquipment),
      job.notes,
      job.status,
    ]);

    return this.mapRowToJob(result.rows[0]);
  }

  async findById(id: string): Promise<Job | null> {
    const query = `
      SELECT
        id, customer_id, service_type,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        address, estimated_duration_minutes, priority,
        time_window_start, time_window_end, required_skills, required_equipment,
        notes, status, assigned_technician_id, assigned_route_id,
        scheduled_time, completed_time, created_at, updated_at
      FROM jobs
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  async findAll(filters?: {
    status?: JobStatus;
    serviceType?: string;
    customerId?: string;
    assignedTechnicianId?: string;
  }): Promise<Job[]> {
    let query = `
      SELECT
        id, customer_id, service_type,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        address, estimated_duration_minutes, priority,
        time_window_start, time_window_end, required_skills, required_equipment,
        notes, status, assigned_technician_id, assigned_route_id,
        scheduled_time, completed_time, created_at, updated_at
      FROM jobs
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.serviceType) {
      query += ` AND service_type = $${paramCount}`;
      params.push(filters.serviceType);
      paramCount++;
    }

    if (filters?.customerId) {
      query += ` AND customer_id = $${paramCount}`;
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.assignedTechnicianId) {
      query += ` AND assigned_technician_id = $${paramCount}`;
      params.push(filters.assignedTechnicianId);
      paramCount++;
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    const result = await db.query(query, params);
    return result.rows.map(row => this.mapRowToJob(row));
  }

  async update(id: string, updates: Partial<Job>): Promise<Job | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      params.push(updates.status);
      paramCount++;
    }

    if (updates.assignedTechnicianId !== undefined) {
      fields.push(`assigned_technician_id = $${paramCount}`);
      params.push(updates.assignedTechnicianId);
      paramCount++;
    }

    if (updates.assignedRouteId !== undefined) {
      fields.push(`assigned_route_id = $${paramCount}`);
      params.push(updates.assignedRouteId);
      paramCount++;
    }

    if (updates.scheduledTime !== undefined) {
      fields.push(`scheduled_time = $${paramCount}`);
      params.push(updates.scheduledTime);
      paramCount++;
    }

    if (updates.completedTime !== undefined) {
      fields.push(`completed_time = $${paramCount}`);
      params.push(updates.completedTime);
      paramCount++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const query = `
      UPDATE jobs
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id, customer_id, service_type,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        address, estimated_duration_minutes, priority,
        time_window_start, time_window_end, required_skills, required_equipment,
        notes, status, assigned_technician_id, assigned_route_id,
        scheduled_time, completed_time, created_at, updated_at
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM jobs WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      customerId: row.customer_id,
      serviceType: row.service_type,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        address: row.address,
      },
      estimatedDurationMinutes: row.estimated_duration_minutes,
      priority: row.priority,
      timeWindow: row.time_window_start && row.time_window_end
        ? {
            start: new Date(row.time_window_start),
            end: new Date(row.time_window_end),
          }
        : undefined,
      requiredSkills: row.required_skills,
      requiredEquipment: row.required_equipment,
      notes: row.notes,
      status: row.status,
      assignedTechnicianId: row.assigned_technician_id,
      assignedRouteId: row.assigned_route_id,
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time) : undefined,
      completedTime: row.completed_time ? new Date(row.completed_time) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new JobRepository();
