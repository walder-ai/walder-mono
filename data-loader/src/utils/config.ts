const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  clickhouse: {
    url: process.env.CLICKHOUSE_URL!,
    database: process.env.CLICKHOUSE_DATABASE!,
    username: process.env.CLICKHOUSE_USER || '',
    password: process.env.CLICKHOUSE_PASSWORD || ''
  },
  
  exchange: {
    name: process.env.EXCHANGE || 'binance',
    options: {
      defaultType: 'future',
      enableRateLimit: true,
      timeout: parseInt(process.env.EXCHANGE_TIMEOUT || '30000')
    }
  },
  
  sync: {
    startDate: process.env.SYNC_START_DATE || '2024-01-01',
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '5000'),
    timeframe: process.env.SYNC_TIMEFRAME || '5m'
  },
  
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  },
  
  environment: {
    isProduction,
    isDevelopment: !isProduction
  }
};