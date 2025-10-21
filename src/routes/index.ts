import { Router } from 'express';
import routeController from '../controllers/routeController';
import jobController from '../controllers/jobController';
import technicianController from '../controllers/technicianController';

const router = Router();

// Route optimization endpoints
router.post('/routes/optimize', (req, res) => routeController.optimizeRoutes(req, res));
router.get('/routes', (req, res) => routeController.getRoutes(req, res));
router.get('/routes/:id', (req, res) => routeController.getRouteById(req, res));
router.patch('/routes/:id', (req, res) => routeController.updateRoute(req, res));
router.delete('/routes/:id', (req, res) => routeController.deleteRoute(req, res));

// Job management endpoints
router.post('/jobs', (req, res) => jobController.createJob(req, res));
router.get('/jobs', (req, res) => jobController.getJobs(req, res));
router.get('/jobs/:id', (req, res) => jobController.getJobById(req, res));
router.patch('/jobs/:id', (req, res) => jobController.updateJob(req, res));
router.delete('/jobs/:id', (req, res) => jobController.deleteJob(req, res));

// Technician management endpoints
router.post('/technicians', (req, res) => technicianController.createTechnician(req, res));
router.get('/technicians', (req, res) => technicianController.getTechnicians(req, res));
router.get('/technicians/:id', (req, res) => technicianController.getTechnicianById(req, res));
router.patch('/technicians/:id', (req, res) => technicianController.updateTechnician(req, res));
router.post('/technicians/:id/location', (req, res) => technicianController.updateLocation(req, res));
router.delete('/technicians/:id', (req, res) => technicianController.deleteTechnician(req, res));

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

export default router;
