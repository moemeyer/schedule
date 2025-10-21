import { Request, Response } from 'express';
import technicianRepository from '../repositories/technicianRepository';

export class TechnicianController {
  async createTechnician(req: Request, res: Response): Promise<void> {
    try {
      const technician = await technicianRepository.create(req.body);
      res.status(201).json(technician);
    } catch (error) {
      console.error('Create technician error:', error);
      res.status(500).json({ error: 'Failed to create technician' });
    }
  }

  async getTechnicians(req: Request, res: Response): Promise<void> {
    try {
      const { activeOnly } = req.query;
      const technicians = await technicianRepository.findAll(activeOnly === 'true');
      res.status(200).json(technicians);
    } catch (error) {
      console.error('Get technicians error:', error);
      res.status(500).json({ error: 'Failed to fetch technicians' });
    }
  }

  async getTechnicianById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const technician = await technicianRepository.findById(id);

      if (!technician) {
        res.status(404).json({ error: 'Technician not found' });
        return;
      }

      res.status(200).json(technician);
    } catch (error) {
      console.error('Get technician error:', error);
      res.status(500).json({ error: 'Failed to fetch technician' });
    }
  }

  async updateTechnician(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const technician = await technicianRepository.update(id, req.body);

      if (!technician) {
        res.status(404).json({ error: 'Technician not found' });
        return;
      }

      res.status(200).json(technician);
    } catch (error) {
      console.error('Update technician error:', error);
      res.status(500).json({ error: 'Failed to update technician' });
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        res.status(400).json({ error: 'Latitude and longitude are required' });
        return;
      }

      const technician = await technicianRepository.update(id, {
        currentLocation: { latitude, longitude },
      });

      if (!technician) {
        res.status(404).json({ error: 'Technician not found' });
        return;
      }

      res.status(200).json(technician);
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  }

  async deleteTechnician(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await technicianRepository.delete(id);

      if (!success) {
        res.status(404).json({ error: 'Technician not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete technician error:', error);
      res.status(500).json({ error: 'Failed to delete technician' });
    }
  }
}

export default new TechnicianController();
