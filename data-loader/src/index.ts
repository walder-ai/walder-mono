import './app';
import { SyncService } from './modules/sync/service';
import { ExchangeService } from './utils/exchange';

console.log('▲ Starting data service');

ExchangeService.testConnection()
  .then(async isConnected => {
    if (isConnected) {
      console.log('● Exchange connected');
      
      // Check if we have recent data to determine if full sync is needed
      const symbols = await ExchangeService.getActiveSymbols();
      const recentDataExists = symbols.length > 0 && await SyncService.hasRecentData();
      
      if (recentDataExists) {
        console.log('● Recent data found, starting latest sync');
        SyncService.syncLatestData().catch(error => {
          console.error('× Latest sync failed:', error);
        });
      } else {
        console.log('→ No recent data, starting full sync');
        SyncService.syncAllSymbols().catch(error => {
          console.error('× Initial sync failed:', error);
        });
      }
    } else {
      console.warn('! Exchange connection failed, retrying later');
    }
  })
  .catch(error => {
    console.error('× Exchange connection failed:', error);
  });

console.log('● Server ready');

process.on('SIGINT', async () => {
  console.log('\n■ Shutting down...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (SyncService.isCurrentlyRunning() && attempts < maxAttempts) {
    console.log(`→ Waiting for sync (${attempts + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    console.log('! Forced shutdown');
  } else {
    console.log('● Clean shutdown');
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('■ SIGTERM received');
  process.exit(0);
});