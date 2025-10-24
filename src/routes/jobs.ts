import { Router } from 'express';
import { JobModel } from '../models/Job';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const job = await JobModel.create(req.body);
    res.status(201).json(job);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const jobs = await JobModel.findAll();
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await JobModel.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const job = await JobModel.update(req.params.id, req.body);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
