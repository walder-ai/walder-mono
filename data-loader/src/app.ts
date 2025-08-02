import { Elysia } from 'elysia';
import { health } from './modules/health';
import { sync } from './modules/sync';
import { config } from './utils/config';

export const app = new Elysia({ name: 'data-loader' })
  .use(health)
  .use(sync)
  .listen({
    hostname: config.server.host,
    port: config.server.port
  }, () => {
    console.log(`● Server listening on ${config.server.host}:${config.server.port}`);
  });