import { createClient, RedisClientType, TimeSeriesAggregationType } from 'redis'
import { TimeSeriesService, OHLCVData } from '../interfaces'
import { RedisTimeSeriesKeyBuilder } from '../models/redis.model'
import { config } from '../../config'

export class RedisTimeSeriesService implements TimeSeriesService {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 5000
      }
    })

    this.setupEventListeners()
  }

  async addDataPoint(key: string, timestamp: number, value: number): Promise<void> {
    if (!this.client) return

    try {
      await this.ensureConnection()
      await this.client.ts.add(key, timestamp, value, {
        RETENTION: 0,
        DUPLICATE_POLICY: 'LAST'
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('TSDB: key does not exist')) {
        await this.client.ts.create(key, {
          RETENTION: 0,
          DUPLICATE_POLICY: 'LAST'
        })
        await this.client.ts.add(key, timestamp, value)
      } else {
        throw error
      }
    }
  }

  async addBulkData(keyPrefix: string, data: OHLCVData[]): Promise<void> {
    if (!this.client || data.length === 0) return

    try {
      await this.ensureConnection()
      
      const pipeline = this.client.multi()
      
      for (const candle of data) {
        const keys = {
          open: `${keyPrefix}:Open`,
          high: `${keyPrefix}:High`,
          low: `${keyPrefix}:Low`,
          close: `${keyPrefix}:Close`,
          volume: `${keyPrefix}:Volume`
        }

        Object.entries(keys).forEach(([type, key]) => {
          const value = candle[type as keyof OHLCVData] as number
          pipeline.ts.add(key, candle.timestamp, value, {
            ON_DUPLICATE: 'LAST'
          })
        })
      }
      
      await pipeline.exec()
    } catch (error) {
      await this.createKeysAndRetry(keyPrefix, data)
    }
  }

  async getRange(keyPrefix: string, fromTimestamp: number, toTimestamp: number): Promise<OHLCVData[]> {
    if (!this.client) return []

    try {
      await this.ensureConnection()
      
      const keys = {
        open: `${keyPrefix}:Open`,
        high: `${keyPrefix}:High`,
        low: `${keyPrefix}:Low`,
        close: `${keyPrefix}:Close`,
        volume: `${keyPrefix}:Volume`
      }

      const pipeline = this.client.multi()
      Object.values(keys).forEach(key => {
        pipeline.ts.range(key, fromTimestamp, toTimestamp)
      })

      const results = await pipeline.exec()
      
      if (!results || results.length !== 5) return []

      const [openData, highData, lowData, closeData, volumeData] = results.map(r => r?.result || [])
      
      const candles: OHLCVData[] = []
      const timestamps = new Set()
      
      ;[openData, highData, lowData, closeData, volumeData].forEach(data => {
        (data as any[]).forEach(([timestamp]) => timestamps.add(timestamp))
      })

      Array.from(timestamps).sort().forEach(timestamp => {
        const findValue = (data: any[], ts: number) => {
          const point = data.find(([t]) => t === ts)
          return point ? point[1] : 0
        }

        candles.push({
          timestamp: timestamp as number,
          open: findValue(openData as any[], timestamp as number),
          high: findValue(highData as any[], timestamp as number),
          low: findValue(lowData as any[], timestamp as number),
          close: findValue(closeData as any[], timestamp as number),
          volume: findValue(volumeData as any[], timestamp as number)
        })
      })

      return candles
    } catch (error) {
      return []
    }
  }

  async getLastTimestamp(keyPrefix: string): Promise<number | null> {
    if (!this.client) return null

    try {
      await this.ensureConnection()
      const key = `${keyPrefix}:Close`
      
      const result = await this.client.ts.get(key)
      return result?.timestamp || null
    } catch (error) {
      return null
    }
  }

  async getTimeSeriesInfo(keyPrefix: string): Promise<{
    totalSamples: number | null
    firstTimestamp: number | null  
    lastTimestamp: number | null
    exists: boolean
  }> {
    if (!this.client) return { totalSamples: null, firstTimestamp: null, lastTimestamp: null, exists: false }

    try {
      await this.ensureConnection()
      const key = `${keyPrefix}:Close`
      
      const info = await this.client.ts.info(key)
      return {
        totalSamples: info.totalSamples || 0,
        firstTimestamp: info.firstTimestamp || null,
        lastTimestamp: info.lastTimestamp || null,
        exists: true
      }
    } catch (error) {
      return { totalSamples: null, firstTimestamp: null, lastTimestamp: null, exists: false }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect()
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client) return
    
    if (!this.isConnected && !this.client.isOpen) {
      await this.client.connect()
    }
  }

  private async createKeysAndRetry(keyPrefix: string, data: OHLCVData[]): Promise<void> {
    if (!this.client) return

    try {
      const keys = ['Open', 'High', 'Low', 'Close', 'Volume']
      
      for (const type of keys) {
        const key = `${keyPrefix}:${type}`
        try {
          await this.client.ts.create(key, {
            RETENTION: 0,
            DUPLICATE_POLICY: 'LAST'
          })
        } catch (error) {
          // Key might already exist
        }
      }
      
      await this.addBulkData(keyPrefix, data)
    } catch (error) {
      throw error
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return

    this.client.on('error', (err) => {
      this.isConnected = false
    })

    this.client.on('connect', () => {
      this.isConnected = true
    })

    this.client.on('disconnect', () => {
      this.isConnected = false
    })
  }
} 