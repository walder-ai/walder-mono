import { insertCandles, getLastTimestamp, type OHLCV } from '../../utils/database';
import { config } from '../../utils/config';
import { ExchangeService } from '../../utils/exchange';

interface SyncStats {
  symbolsProcessed: number;
  candlesInserted: number;
  errors: number;
  startTime: Date;
}

export abstract class SyncService {
  private static isRunning = false;
  private static isLatestRunning = false;
  
  private static syncStats: SyncStats = {
    symbolsProcessed: 0,
    candlesInserted: 0,
    errors: 0,
    startTime: new Date()
  };

  static async syncSymbol(symbol: string): Promise<void> {
    try {
      const lastTimestamp = await getLastTimestamp(symbol);
      const configStartDate = new Date(config.sync.startDate).getTime();
      
      let since: number = configStartDate;
      
      if (lastTimestamp && lastTimestamp.getTime() >= configStartDate) {
        since = lastTimestamp.getTime() + 300000;
        console.log(`→ ${symbol}: continuing from ${lastTimestamp.toISOString()}`);
      } else {
        console.log(`→ ${symbol}: starting from ${config.sync.startDate}`);
      }
      
      const now = Date.now();
      let totalCandles = 0;
      
      while (since < now) {
        console.log(`→ ${symbol}: fetching from ${new Date(since).toISOString()}`);
        const ohlcv = await ExchangeService.fetchOHLCV(symbol, config.sync.timeframe, since, config.sync.batchSize);
        
        if (ohlcv.length === 0) {
          console.log(`● ${symbol}: no more data`);
          break;
        }
        
        const candles: OHLCV[] = ohlcv.map((candle: number[]) => ({
          symbol,
          timestamp: Math.floor(candle[0] / 1000),
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[5])
        }));
        
        await insertCandles(candles);
        totalCandles += candles.length;
        console.log(`● ${symbol}: saved ${candles.length} (${totalCandles} total)`);
        
        since = Math.max(...ohlcv.map((candle: number[]) => candle[0])) + 300000;
      }
      
      if (totalCandles > 0) {
        console.log(`● ${symbol}: completed ${totalCandles} candles`);
      }
      
      this.syncStats.symbolsProcessed++;
      this.syncStats.candlesInserted += totalCandles;
      
    } catch (error) {
      console.error(`× Error syncing ${symbol}:`, error);
      this.syncStats.errors++;
    }
  }

  static async syncLatestData(): Promise<void> {
    if (this.isLatestRunning || this.isRunning) {
      console.log('! Sync already running, skipping');
      return;
    }

    this.isLatestRunning = true;
    console.log('→ Latest data sync started');

    try {
      const symbols = await ExchangeService.getActiveSymbols();
      
      for (const symbol of symbols) {
        if (this.isRunning) {
          console.log('! Full sync started, stopping latest');
          break;
        }
        
        const lastTimestamp = await getLastTimestamp(symbol);
        if (!lastTimestamp) continue;
        
        const since = lastTimestamp.getTime() + 300000;
        const now = Date.now();
        
        if (since >= now) continue;
        
        const ohlcv = await ExchangeService.fetchOHLCV(symbol, config.sync.timeframe, since, 100);
        
        if (ohlcv.length === 0) continue;
        
        const candles: OHLCV[] = ohlcv.map((candle: number[]) => ({
          symbol,
          timestamp: Math.floor(candle[0] / 1000),
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[5])
        }));
        
        await insertCandles(candles);
        console.log(`● ${symbol}: synced ${candles.length} latest`);
      }
    } catch (error) {
      console.error('× Latest sync failed:', error);
    } finally {
      this.isLatestRunning = false;
    }
  }

  static async syncAllSymbols(): Promise<void> {
    if (this.isRunning) {
      console.log('! Sync already running, skipping');
      return;
    }

    this.isRunning = true;
    console.log('→ Full synchronization started');
    console.log(`→ Target start: ${config.sync.startDate}`);
    
    this.syncStats = {
      symbolsProcessed: 0,
      candlesInserted: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const symbols = await ExchangeService.getActiveSymbols();
      console.log(`→ Found ${symbols.length} active symbols`);
      
      for (const symbol of symbols) {
        if (!this.isRunning) {
          console.log('■ Sync cancelled');
          break;
        }
        
        await this.syncSymbol(symbol);
      }
      
      const duration = Date.now() - this.syncStats.startTime.getTime();
      console.log(`● Full sync completed: ${this.syncStats.symbolsProcessed} symbols, ${this.syncStats.candlesInserted} candles, ${this.syncStats.errors} errors (${Math.round(duration / 1000)}s)`);
      
    } catch (error) {
      console.error('× Full sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  static getStats() {
    return { 
      ...this.syncStats, 
      isRunning: this.isRunning || this.isLatestRunning 
    };
  }

  static isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  static async hasRecentData(): Promise<boolean> {
    try {
      const symbols = await ExchangeService.getActiveSymbols();
      if (symbols.length === 0) return false;
      
      // Check first symbol for recent data (within last hour)
      const lastTimestamp = await getLastTimestamp(symbols[0]);
      if (!lastTimestamp) return false;
      
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return lastTimestamp.getTime() > oneHourAgo;
    } catch (error) {
      console.error('× Error checking recent data:', error);
      return false;
    }
  }
};