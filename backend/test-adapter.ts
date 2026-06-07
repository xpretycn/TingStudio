import 'dotenv/config';
import { connectDatabase } from './src/config/database-adapter.js';

console.log('Testing database-adapter connection...');

try {
  await connectDatabase();
  console.log('Database connected successfully!');
} catch (e) {
  console.error('Database connection failed:', e.message);
}
