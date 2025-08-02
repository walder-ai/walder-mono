import { t } from 'elysia';

export const HealthModel = {
  healthResponse: t.Object({
    status: t.String(),
    timestamp: t.Date()
  })
};