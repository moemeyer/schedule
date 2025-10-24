import { Router } from 'express';
import { TechnicianModel } from '../models/Technician';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const technician = await TechnicianModel.create(req.body);
    res.status(201).json(technician);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const technicians = await TechnicianModel.findAll();
    res.json(technicians);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const technician = await TechnicianModel.findById(req.params.id);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const technician = await TechnicianModel.update(req.params.id, req.body);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/location', async (req, res) => {
  try {
    const technician = await TechnicianModel.update(req.params.id, { currentLocation: req.body });
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
