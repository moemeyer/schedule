import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import routes from './routes';
import db from './database/connection';
import { GPSTrackingService } from './services/gpsTrackingService';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', routes);

// Initialize GPS tracking service
const gpsTrackingService = new GPSTrackingService(io);

// Database health check on startup
const initializeApp = async (): Promise<void> => {
  try {
    const isHealthy = await db.healthCheck();

    if (!isHealthy) {
      console.error('Database health check failed');
      process.exit(1);
    }

    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('Shutting down gracefully...');

  httpServer.close(async () => {
    console.log('HTTP server closed');

    try {
      await db.close();
      console.log('Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const startServer = async (): Promise<void> => {
  await initializeApp();

  httpServer.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('Intelligent Routing Service');
    console.log('='.repeat(50));
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
    console.log(`WebSocket server ready for GPS tracking`);
    console.log('='.repeat(50));
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io, gpsTrackingService };
