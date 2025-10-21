import { Client, TravelMode, UnitSystem } from '@googlemaps/google-maps-services-js';
import { Location, DistanceMatrixEntry } from '../types';
import db from '../database/connection';

export class DistanceService {
  private googleMapsClient: Client;
  private cacheEnabled: boolean = true;
  private cacheDurationHours: number = 24;

  constructor(apiKey: string) {
    this.googleMapsClient = new Client({});
  }

  /**
   * Calculate Haversine distance between two points (in km)
   */
  calculateHaversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
    const lat1 = this.toRadians(loc1.latitude);
    const lat2 = this.toRadians(loc2.latitude);
    const deltaLat = this.toRadians(loc2.latitude - loc1.latitude);
    const deltaLng = this.toRadians(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get distance and duration from cache or Google Maps API
   */
  async getDistance(
    origin: Location,
    destination: Location,
    useCache: boolean = true
  ): Promise<DistanceMatrixEntry> {
    // Check cache first
    if (useCache && this.cacheEnabled) {
      const cached = await this.getCachedDistance(origin, destination);
      if (cached) {
        return cached;
      }
    }

    // Use Google Maps API
    try {
      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins: [`${origin.latitude},${origin.longitude}`],
          destinations: [`${destination.latitude},${destination.longitude}`],
          mode: TravelMode.driving,
          units: UnitSystem.metric,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (
        response.data.rows[0]?.elements[0]?.status === 'OK' &&
        response.data.rows[0].elements[0].distance &&
        response.data.rows[0].elements[0].duration
      ) {
        const element = response.data.rows[0].elements[0];
        const distanceKm = element.distance.value / 1000;
        const durationMinutes = Math.ceil(element.duration.value / 60);

        const entry: DistanceMatrixEntry = {
          origin,
          destination,
          distanceKm,
          durationMinutes,
          timestamp: new Date(),
        };

        // Cache the result
        if (this.cacheEnabled) {
          await this.cacheDistance(entry);
        }

        return entry;
      }
    } catch (error) {
      console.error('Google Maps API error, falling back to Haversine:', error);
    }

    // Fallback to Haversine distance with estimated duration
    const distanceKm = this.calculateHaversineDistance(origin, destination);
    const durationMinutes = Math.ceil((distanceKm / 50) * 60); // Assume 50 km/h average

    return {
      origin,
      destination,
      distanceKm,
      durationMinutes,
      timestamp: new Date(),
    };
  }

  /**
   * Get distance matrix for multiple origins and destinations
   */
  async getDistanceMatrix(
    origins: Location[],
    destinations: Location[]
  ): Promise<DistanceMatrixEntry[][]> {
    const matrix: DistanceMatrixEntry[][] = [];

    for (const origin of origins) {
      const row: DistanceMatrixEntry[] = [];
      for (const destination of destinations) {
        const entry = await this.getDistance(origin, destination);
        row.push(entry);
      }
      matrix.push(row);
    }

    return matrix;
  }

  /**
   * Get cached distance from database
   */
  private async getCachedDistance(
    origin: Location,
    destination: Location
  ): Promise<DistanceMatrixEntry | null> {
    try {
      const query = `
        SELECT
          origin_lat, origin_lng,
          destination_lat, destination_lng,
          distance_km, duration_minutes, timestamp
        FROM distance_matrix_cache
        WHERE
          ABS(origin_lat - $1) < 0.001 AND
          ABS(origin_lng - $2) < 0.001 AND
          ABS(destination_lat - $3) < 0.001 AND
          ABS(destination_lng - $4) < 0.001 AND
          timestamp > NOW() - INTERVAL '${this.cacheDurationHours} hours'
        LIMIT 1
      `;

      const result = await db.query(query, [
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
      ]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          origin,
          destination,
          distanceKm: parseFloat(row.distance_km),
          durationMinutes: parseInt(row.duration_minutes),
          timestamp: row.timestamp,
        };
      }
    } catch (error) {
      console.error('Error retrieving cached distance:', error);
    }

    return null;
  }

  /**
   * Cache distance in database
   */
  private async cacheDistance(entry: DistanceMatrixEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO distance_matrix_cache
        (origin_lat, origin_lng, destination_lat, destination_lng, distance_km, duration_minutes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await db.query(query, [
        entry.origin.latitude,
        entry.origin.longitude,
        entry.destination.latitude,
        entry.destination.longitude,
        entry.distanceKm,
        entry.durationMinutes,
      ]);
    } catch (error) {
      console.error('Error caching distance:', error);
    }
  }
}
