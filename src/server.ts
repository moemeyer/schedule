import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import technicianRoutes from './routes/technicians';
import jobRoutes from './routes/jobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/technicians', technicianRoutes);
app.use('/api/jobs', jobRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
