import * as service from '../services/cityService.js';

export async function list(req, res) { res.json({ data: await service.list({ includeInactive: req.query.incluirInactivas === 'true' }) }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id, { includeInactive: req.isAdmin }) }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(req.body) }); }
export async function update(req, res) { res.json({ data: await service.update(req.params.id, req.body) }); }
export async function remove(req, res) { await service.remove(req.params.id); res.json({ data: { deleted: true } }); }
