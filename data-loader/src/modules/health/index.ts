import { Elysia } from 'elysia';
import { HealthService } from './service';
import { HealthModel } from './model';

export const health = new Elysia({ prefix: '/health' })
  .model(HealthModel)
  .get('/', () => HealthService.getHealthStatus(), {
    response: {
      200: 'healthResponse'
    }
  });