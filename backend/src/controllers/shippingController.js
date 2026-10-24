import { estimate } from '../services/cityService.js';

export async function quote(req, res) { res.json({ data: await estimate(req.body) }); }
