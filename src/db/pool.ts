import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://routing_user:routing_pass@localhost:5432/routing_app'
});

export default pool;
