import { healthService } from '../services/health.service.js';

export async function healthController(req, res) {
  const data = await healthService();
  res.json({ success: true, data });
}
