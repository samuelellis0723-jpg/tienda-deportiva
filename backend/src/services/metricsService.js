import * as metrics from '../models/metricsModel.js';

export async function summary() { return { data: await metrics.getSummary() }; }
export async function replenishmentAlerts() { return metrics.getReplenishmentAlerts(); }
