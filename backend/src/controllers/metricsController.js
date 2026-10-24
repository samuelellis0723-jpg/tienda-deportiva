import * as service from '../services/metricsService.js';

export async function summary(_req, res) { res.json(await service.summary()); }
export async function replenishmentAlerts(_req, res) { res.json(await service.replenishmentAlerts()); }
