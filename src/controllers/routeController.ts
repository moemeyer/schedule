import { Request, Response } from 'express';
import { RouteOptimizer } from '../services/routeOptimizer';
import { DistanceService } from '../services/distanceService';
import routeRepository from '../repositories/routeRepository';
import jobRepository from '../repositories/jobRepository';
import technicianRepository from '../repositories/technicianRepository';
import { RouteOptimizationRequest } from '../types';

const distanceService = new DistanceService(process.env.GOOGLE_MAPS_API_KEY || '');
const routeOptimizer = new RouteOptimizer(distanceService);

export class RouteController {
  /**
   * Optimize and create routes for a specific date
   */
  async optimizeRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { date, jobIds, technicianIds, constraints } = req.body;

      if (!date) {
        res.status(400).json({ error: 'Date is required' });
        return;
      }

      // Get jobs
      const allJobs = await jobRepository.findAll({ status: 'pending' });
      const jobs = jobIds
        ? allJobs.filter(j => jobIds.includes(j.id))
        : allJobs;

      if (jobs.length === 0) {
        res.status(400).json({ error: 'No jobs found for optimization' });
        return;
      }

      // Get technicians
      const allTechnicians = await technicianRepository.findAll(true);
      const technicians = technicianIds
        ? allTechnicians.filter(t => technicianIds.includes(t.id))
        : allTechnicians;

      if (technicians.length === 0) {
        res.status(400).json({ error: 'No technicians available' });
        return;
      }

      // For now, we'll need to fetch vehicles separately
      // In a real implementation, add vehicle repository
      const vehicles = []; // TODO: Implement vehicle fetching

      const optimizationRequest: RouteOptimizationRequest = {
        jobs,
        technicians,
        vehicles: vehicles.length > 0 ? vehicles : [{
          id: 'default-vehicle',
          name: 'Default Vehicle',
          type: 'van' as any,
          licensePlate: 'N/A',
          capacity: 1000,
          equipmentTypes: [],
          fuelEfficiency: 10,
          maxRangeKm: 300,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        date: new Date(date),
        constraints,
      };

      const result = await routeOptimizer.optimize(optimizationRequest);

      // Save optimized routes
      const savedRoutes = [];
      for (const optimizedRoute of result.routes) {
        const savedRoute = await routeRepository.create(optimizedRoute.route);
        savedRoutes.push(savedRoute);
      }

      res.status(200).json({
        routes: savedRoutes,
        unassignedJobs: result.unassignedJobs,
        metrics: {
          totalScore: result.totalScore,
          totalDistanceKm: result.totalDistanceKm,
          totalDurationHours: result.totalDurationHours,
          computationTimeMs: result.computationTimeMs,
        },
      });
    } catch (error) {
      console.error('Route optimization error:', error);
      res.status(500).json({ error: 'Failed to optimize routes' });
    }
  }

  /**
   * Get all routes
   */
  async getRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { technicianId, date, status } = req.query;

      const routes = await routeRepository.findAll({
        technicianId: technicianId as string,
        date: date ? new Date(date as string) : undefined,
        status: status as any,
      });

      res.status(200).json(routes);
    } catch (error) {
      console.error('Get routes error:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  /**
   * Get a single route by ID
   */
  async getRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const route = await routeRepository.findById(id);

      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      res.status(200).json(route);
    } catch (error) {
      console.error('Get route error:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  }

  /**
   * Update route status
   */
  async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const route = await routeRepository.update(id, updates);

      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      res.status(200).json(route);
    } catch (error) {
      console.error('Update route error:', error);
      res.status(500).json({ error: 'Failed to update route' });
    }
  }

  /**
   * Delete a route
   */
  async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await routeRepository.delete(id);

      if (!success) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete route error:', error);
      res.status(500).json({ error: 'Failed to delete route' });
    }
  }
}

export default new RouteController();
