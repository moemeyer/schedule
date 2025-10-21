import { Route, RouteStop, RouteStatus } from '../types';
import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export class RouteRepository {
  async create(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    return await db.transaction(async (client) => {
      // Insert route
      const routeQuery = `
        INSERT INTO routes (
          id, date, technician_id, vehicle_id, status,
          start_location, start_address, end_location, end_address,
          total_distance_km, total_duration_minutes, optimization_score, notes
        ) VALUES ($1, $2, $3, $4, $5, ST_GeogFromText($6), $7, ST_GeogFromText($8), $9, $10, $11, $12, $13)
        RETURNING
          id, date, technician_id, vehicle_id, status,
          ST_Y(start_location::geometry) as start_latitude,
          ST_X(start_location::geometry) as start_longitude,
          start_address,
          ST_Y(end_location::geometry) as end_latitude,
          ST_X(end_location::geometry) as end_longitude,
          end_address,
          total_distance_km, total_duration_minutes, optimization_score, notes,
          created_at, updated_at
      `;

      const routeId = uuidv4();
      const routeResult = await client.query(routeQuery, [
        routeId,
        route.date,
        route.technicianId,
        route.vehicleId,
        route.status,
        `POINT(${route.startLocation.longitude} ${route.startLocation.latitude})`,
        route.startLocation.address,
        `POINT(${route.endLocation.longitude} ${route.endLocation.latitude})`,
        route.endLocation.address,
        route.totalDistanceKm,
        route.totalDurationMinutes,
        route.optimizationScore,
        route.notes,
      ]);

      // Insert route stops
      for (const stop of route.stops) {
        const stopQuery = `
          INSERT INTO route_stops (
            route_id, job_id, sequence_number,
            estimated_arrival_time, estimated_departure_time,
            distance_from_previous_km, duration_from_previous_minutes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await client.query(stopQuery, [
          routeId,
          stop.jobId,
          stop.sequenceNumber,
          stop.estimatedArrivalTime,
          stop.estimatedDepartureTime,
          stop.distanceFromPreviousKm,
          stop.durationFromPreviousMinutes,
        ]);

        // Update job with route assignment
        await client.query(
          'UPDATE jobs SET assigned_route_id = $1, scheduled_time = $2, status = $3 WHERE id = $4',
          [routeId, stop.estimatedArrivalTime, 'scheduled', stop.jobId]
        );
      }

      return this.mapRowToRoute(routeResult.rows[0], route.stops);
    });
  }

  async findById(id: string): Promise<Route | null> {
    const routeQuery = `
      SELECT
        id, date, technician_id, vehicle_id, status,
        ST_Y(start_location::geometry) as start_latitude,
        ST_X(start_location::geometry) as start_longitude,
        start_address,
        ST_Y(end_location::geometry) as end_latitude,
        ST_X(end_location::geometry) as end_longitude,
        end_address,
        total_distance_km, total_duration_minutes, optimization_score, notes,
        created_at, updated_at
      FROM routes
      WHERE id = $1
    `;

    const routeResult = await db.query(routeQuery, [id]);

    if (routeResult.rows.length === 0) {
      return null;
    }

    // Get route stops
    const stopsQuery = `
      SELECT
        id, route_id, job_id, sequence_number,
        estimated_arrival_time, estimated_departure_time,
        actual_arrival_time, actual_departure_time,
        distance_from_previous_km, duration_from_previous_minutes
      FROM route_stops
      WHERE route_id = $1
      ORDER BY sequence_number ASC
    `;

    const stopsResult = await db.query(stopsQuery, [id]);
    const stops = stopsResult.rows.map(row => this.mapRowToRouteStop(row));

    return this.mapRowToRoute(routeResult.rows[0], stops);
  }

  async findAll(filters?: {
    technicianId?: string;
    date?: Date;
    status?: RouteStatus;
  }): Promise<Route[]> {
    let query = `
      SELECT
        id, date, technician_id, vehicle_id, status,
        ST_Y(start_location::geometry) as start_latitude,
        ST_X(start_location::geometry) as start_longitude,
        start_address,
        ST_Y(end_location::geometry) as end_latitude,
        ST_X(end_location::geometry) as end_longitude,
        end_address,
        total_distance_km, total_duration_minutes, optimization_score, notes,
        created_at, updated_at
      FROM routes
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters?.technicianId) {
      query += ` AND technician_id = $${paramCount}`;
      params.push(filters.technicianId);
      paramCount++;
    }

    if (filters?.date) {
      query += ` AND date = $${paramCount}`;
      params.push(filters.date);
      paramCount++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const routeResult = await db.query(query, params);
    const routes: Route[] = [];

    for (const row of routeResult.rows) {
      const stopsQuery = `
        SELECT
          id, route_id, job_id, sequence_number,
          estimated_arrival_time, estimated_departure_time,
          actual_arrival_time, actual_departure_time,
          distance_from_previous_km, duration_from_previous_minutes
        FROM route_stops
        WHERE route_id = $1
        ORDER BY sequence_number ASC
      `;

      const stopsResult = await db.query(stopsQuery, [row.id]);
      const stops = stopsResult.rows.map(stopRow => this.mapRowToRouteStop(stopRow));

      routes.push(this.mapRowToRoute(row, stops));
    }

    return routes;
  }

  async update(id: string, updates: Partial<Route>): Promise<Route | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (updates.status) {
      fields.push(`status = $${paramCount}`);
      params.push(updates.status);
      paramCount++;
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      params.push(updates.notes);
      paramCount++;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const query = `
      UPDATE routes
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `;

    await db.query(query, params);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM routes WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  private mapRowToRoute(row: any, stops: RouteStop[]): Route {
    return {
      id: row.id,
      date: new Date(row.date),
      technicianId: row.technician_id,
      vehicleId: row.vehicle_id,
      status: row.status,
      startLocation: {
        latitude: parseFloat(row.start_latitude),
        longitude: parseFloat(row.start_longitude),
        address: row.start_address,
      },
      endLocation: {
        latitude: parseFloat(row.end_latitude),
        longitude: parseFloat(row.end_longitude),
        address: row.end_address,
      },
      stops,
      totalDistanceKm: parseFloat(row.total_distance_km),
      totalDurationMinutes: row.total_duration_minutes,
      optimizationScore: parseFloat(row.optimization_score),
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToRouteStop(row: any): RouteStop {
    return {
      jobId: row.job_id,
      sequenceNumber: row.sequence_number,
      estimatedArrivalTime: new Date(row.estimated_arrival_time),
      estimatedDepartureTime: new Date(row.estimated_departure_time),
      actualArrivalTime: row.actual_arrival_time ? new Date(row.actual_arrival_time) : undefined,
      actualDepartureTime: row.actual_departure_time ? new Date(row.actual_departure_time) : undefined,
      distanceFromPreviousKm: parseFloat(row.distance_from_previous_km),
      durationFromPreviousMinutes: row.duration_from_previous_minutes,
    };
  }
}

export default new RouteRepository();
