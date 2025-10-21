import { Server as SocketIOServer, Socket } from 'socket.io';
import { GPSUpdate } from '../types';
import db from '../database/connection';
import technicianRepository from '../repositories/technicianRepository';

export class GPSTrackingService {
  private io: SocketIOServer;
  private connectedTechnicians: Map<string, Socket> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Technician connects and provides their ID
      socket.on('technician:connect', async (technicianId: string) => {
        this.connectedTechnicians.set(technicianId, socket);
        socket.data.technicianId = technicianId;
        console.log(`Technician ${technicianId} connected`);

        // Join technician-specific room
        socket.join(`technician:${technicianId}`);

        // Notify dashboard that technician is online
        this.io.emit('technician:online', { technicianId });
      });

      // Receive GPS updates from technician
      socket.on('gps:update', async (data: GPSUpdate) => {
        try {
          const { technicianId, location, speed, heading } = data;

          // Validate data
          if (!technicianId || !location || !location.latitude || !location.longitude) {
            socket.emit('error', { message: 'Invalid GPS data' });
            return;
          }

          // Save to database
          await this.saveGPSUpdate({
            technicianId,
            location,
            speed,
            heading,
            timestamp: new Date(),
          });

          // Update technician's current location
          await technicianRepository.update(technicianId, {
            currentLocation: location,
          });

          // Broadcast to dashboard
          this.io.emit('gps:update', {
            technicianId,
            location,
            speed,
            heading,
            timestamp: new Date(),
          });

          console.log(`GPS update received from technician ${technicianId}`);
        } catch (error) {
          console.error('Error processing GPS update:', error);
          socket.emit('error', { message: 'Failed to process GPS update' });
        }
      });

      // Get real-time location of a technician
      socket.on('gps:request', async (technicianId: string) => {
        try {
          const technician = await technicianRepository.findById(technicianId);

          if (technician && technician.currentLocation) {
            socket.emit('gps:response', {
              technicianId,
              location: technician.currentLocation,
              timestamp: new Date(),
            });
          } else {
            socket.emit('error', { message: 'Technician location not available' });
          }
        } catch (error) {
          console.error('Error fetching GPS location:', error);
          socket.emit('error', { message: 'Failed to fetch location' });
        }
      });

      // Get all active technician locations
      socket.on('gps:all', async () => {
        try {
          const technicians = await technicianRepository.findAll(true);
          const locations = technicians
            .filter(t => t.currentLocation)
            .map(t => ({
              technicianId: t.id,
              name: t.name,
              location: t.currentLocation!,
            }));

          socket.emit('gps:all:response', locations);
        } catch (error) {
          console.error('Error fetching all locations:', error);
          socket.emit('error', { message: 'Failed to fetch locations' });
        }
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        const technicianId = socket.data.technicianId;

        if (technicianId) {
          this.connectedTechnicians.delete(technicianId);
          console.log(`Technician ${technicianId} disconnected`);

          // Notify dashboard that technician is offline
          this.io.emit('technician:offline', { technicianId });
        }

        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private async saveGPSUpdate(update: GPSUpdate): Promise<void> {
    const query = `
      INSERT INTO gps_updates (technician_id, location, speed, heading, timestamp)
      VALUES ($1, ST_GeogFromText($2), $3, $4, $5)
    `;

    await db.query(query, [
      update.technicianId,
      `POINT(${update.location.longitude} ${update.location.latitude})`,
      update.speed,
      update.heading,
      update.timestamp,
    ]);
  }

  /**
   * Get GPS history for a technician
   */
  async getGPSHistory(technicianId: string, startDate: Date, endDate: Date): Promise<GPSUpdate[]> {
    const query = `
      SELECT
        technician_id,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        speed, heading, timestamp
      FROM gps_updates
      WHERE technician_id = $1
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
    `;

    const result = await db.query(query, [technicianId, startDate, endDate]);

    return result.rows.map(row => ({
      technicianId: row.technician_id,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
      },
      speed: row.speed ? parseFloat(row.speed) : undefined,
      heading: row.heading ? parseFloat(row.heading) : undefined,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Send message to specific technician
   */
  sendToTechnician(technicianId: string, event: string, data: any): void {
    this.io.to(`technician:${technicianId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
}
