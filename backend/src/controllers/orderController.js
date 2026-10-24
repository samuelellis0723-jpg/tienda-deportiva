import * as service from '../services/orderService.js';

export async function create(req, res) { res.status(201).json({ data: await service.create(req.body, req.get('Idempotency-Key')) }); }
export async function list(req, res) { res.json(await service.list(req.query)); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id) }); }
export async function advance(req, res) { res.json({ data: await service.advance(req.params.id, req.body, req.adminUser.id) }); }
export async function confirmPayment(req, res) { res.status(201).json({ data: await service.confirmPayment(req.params.id, req.body, req.adminUser.id) }); }
export async function cancel(req, res) { res.json({ data: await service.cancel(req.params.id, req.adminUser.id) }); }
