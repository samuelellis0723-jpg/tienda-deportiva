import * as service from '../services/categoryService.js';

export async function list(req, res) {
  const includeInactive = req.query.incluirInactivas === 'true';
  res.json({ data: await service.list({ includeInactive }) });
}
export async function get(req, res) { res.json({ data: await service.get(req.params.id, { includeInactive: req.isAdmin }) }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(req.body) }); }
export async function update(req, res) { res.json({ data: await service.update(req.params.id, req.body) }); }
export async function remove(req, res) { await service.remove(req.params.id); res.status(200).json({ data: { deleted: true } }); }