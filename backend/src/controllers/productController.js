import * as service from '../services/productService.js';

export async function list(req, res) { res.json(await service.list(req.query, { includeInactiveRelations: Boolean(req.isAdmin || req.adminUser) })); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id, { publicOnly: !req.isAdmin, admin: Boolean(req.isAdmin) }) }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(req.body) }); }
export async function update(req, res) { res.json({ data: await service.update(req.params.id, req.body) }); }
export async function remove(req, res) { await service.remove(req.params.id); res.status(200).json({ data: { deleted: true } }); }
export async function publish(req, res) { res.json({ data: await service.publish(req.params.id) }); }
export async function unpublish(req, res) { res.json({ data: await service.unpublish(req.params.id) }); }
