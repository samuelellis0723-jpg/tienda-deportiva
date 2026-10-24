import * as service from '../services/couponService.js';

export async function validate(req, res) { res.json({ data: await service.validate(req.body) }); }
export async function list(_req, res) { res.json({ data: await service.list() }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id) }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(req.body) }); }
export async function update(req, res) { res.json({ data: await service.update(req.params.id, req.body) }); }
export async function remove(req, res) { await service.remove(req.params.id); res.json({ data: { deleted: true } }); }
