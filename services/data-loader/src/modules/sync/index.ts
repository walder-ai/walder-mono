import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import { SyncService } from './service';
import { SyncModel } from './model';

export const sync = new Elysia({ name: 'Sync' })
  .model(SyncModel)
  .use(cron({
    name: 'sync-latest-data',
    pattern: '5 * * * * *',
    run() {
      console.log('→ Latest sync scheduled');
      SyncService.syncLatestData().catch((error: Error) => {
        console.error('× Latest sync failed:', error);
      });
    }
  }))
  .use(cron({
    name: 'full-sync',
    pattern: '0 0 */6 * * *',
    run() {
      console.log('→ Full sync scheduled');
      SyncService.syncAllSymbols().catch((error: Error) => {
        console.error('× Full sync failed:', error);
      });
    }
  }));