import { Request, Response } from 'express';
import jobRepository from '../repositories/jobRepository';

export class JobController {
  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const job = await jobRepository.create(req.body);
      res.status(201).json(job);
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  }

  async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const { status, serviceType, customerId, assignedTechnicianId } = req.query;

      const jobs = await jobRepository.findAll({
        status: status as any,
        serviceType: serviceType as string,
        customerId: customerId as string,
        assignedTechnicianId: assignedTechnicianId as string,
      });

      res.status(200).json(jobs);
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await jobRepository.findById(id);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.status(200).json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  }

  async updateJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await jobRepository.update(id, req.body);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.status(200).json(job);
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  }

  async deleteJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await jobRepository.delete(id);

      if (!success) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  }
}

export default new JobController();
