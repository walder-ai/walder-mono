import { createClient } from '@clickhouse/client';
import { config } from './config';

if (config.environment.isDevelopment && config.clickhouse.url.startsWith('https://')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

let _clickhouse: ReturnType<typeof createClient> | null = null;

function getClickHouseClient() {
  if (!_clickhouse) {
    const clientConfig: any = {
      url: config.clickhouse.url,
      database: config.clickhouse.database,
      request_timeout: parseInt(process.env.CLICKHOUSE_REQUEST_TIMEOUT || '30000'),
      compression: {
        request: true,
        response: true
      }
    };

    if (config.clickhouse.username) {
      clientConfig.username = config.clickhouse.username;
    }
    if (config.clickhouse.password) {
      clientConfig.password = config.clickhouse.password;
    }

    _clickhouse = createClient(clientConfig);
  }
  return _clickhouse;
}

export const clickhouse = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    return getClickHouseClient()[prop as keyof ReturnType<typeof createClient>];
  }
});

export interface OHLCV {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function insertCandles(candles: OHLCV[]): Promise<void> {
  if (candles.length === 0) return;
  
  try {
    const transformedCandles = candles.map(candle => ({
      ...candle,
      timestamp: new Date(candle.timestamp * 1000).toISOString().replace('Z', '')
    }));

    await clickhouse.insert({
      table: `${config.clickhouse.database}.binance_futures_5min`,
      values: transformedCandles,
      format: 'JSONEachRow'
    });
  } catch (error) {
    console.error('× Error inserting candles:', error);
    throw error;
  }
}

export async function getLastTimestamp(symbol: string): Promise<Date | null> {
  try {
    const result = await clickhouse.query({
      query: `
        SELECT max(timestamp) as last_timestamp
        FROM ${config.clickhouse.database}.binance_futures_5min
        WHERE symbol = {symbol:String}
      `,
      query_params: { symbol }
    });
    
    const data = await result.json<{ last_timestamp: string }>();
    return data.data[0]?.last_timestamp ? new Date(data.data[0].last_timestamp) : null;
  } catch (error) {
    console.error(`Error getting last timestamp for ${symbol}:`, error);
    return null;
  }
}