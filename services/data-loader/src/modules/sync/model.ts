import { t } from 'elysia';

export const SyncModel = {
  ohlcv: t.Object({
    symbol: t.String(),
    timestamp: t.Number(),
    open: t.Number(),
    high: t.Number(),
    low: t.Number(),
    close: t.Number(),
    volume: t.Number()
  }),

  syncStats: t.Object({
    symbolsProcessed: t.Number(),
    candlesInserted: t.Number(),
    errors: t.Number(),
    startTime: t.Date(),
    isRunning: t.Boolean()
  })
};