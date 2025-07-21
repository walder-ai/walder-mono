import { createClient, RedisClientType } from 'redis'
import { CacheService } from '../interfaces'
import { RedisKeyBuilder } from '../models'
import { SymbolNormalizer } from '../../utils/symbol-normalizer'
import { config } from '../../config'

export class RedisCacheService implements CacheService {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  constructor() {
    if (!config.redis) return

    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 5000
      }
    })

    this.setupEventListeners()
  }

  async set(key: string, data: any): Promise<void> {
    if (!this.client) return

    try {
      await this.ensureConnection()
      await this.client.json.set(key, '$', data)
    } catch (error) {
      console.error('Cache SET error:', error)
    }
  }

  async setMultiple(marketType: string, data: Record<string, any>): Promise<void> {
    if (!this.client || Object.keys(data).length === 0) return

    try {
      await this.ensureConnection()
      
      const pipeline = this.client.multi()
      
      Object.entries(data).forEach(([symbol, tickerData]) => {
        const normalizedSymbol = SymbolNormalizer.normalize(symbol)
        const key = RedisKeyBuilder.buildKey({
          exchange: 'binance',
          marketType: marketType as 'spot' | 'futures',
          symbol: normalizedSymbol
        })
        
        const dataWithSymbol = { ...tickerData, symbol }
        pipeline.json.set(key, '$', dataWithSymbol)
      })
      
      await pipeline.exec()
    } catch (error) {
      console.error('Cache batch SET error:', error)
    }
  }

  async get(key: string): Promise<any> {
    if (!this.client) return null

    try {
      await this.ensureConnection()
      const result = await this.client.json.get(key, { path: '$' })
      
      return Array.isArray(result) && result.length > 0 ? result[0] : null
    } catch (error) {
      console.error('Cache GET error:', error)
      return null
    }
  }

  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    if (!this.client || keys.length === 0) return {}

    try {
      await this.ensureConnection()
      
      const pipeline = this.client.multi()
      keys.forEach(key => pipeline.json.get(key, { path: '$' }))
      
      const results = await pipeline.exec()
      const data: Record<string, any> = {}
      
      if (results) {
        results.forEach((result: any, index) => {
          const key = keys[index]
          
          if (result && !result.error && Array.isArray(result.result) && result.result.length > 0) {
            data[key] = result.result[0]
          } else {
            data[key] = null
          }
        })
      }
      
      return data
    } catch (error) {
      console.error('Cache batch GET error:', error)
      return {}
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect()
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client) return
    
    if (!this.isConnected && !this.client.isOpen) {
      await this.client.connect()
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err)
      this.isConnected = false
    })

    this.client.on('connect', () => {
      this.isConnected = true
      console.log('Redis connected')
    })

    this.client.on('disconnect', () => {
      this.isConnected = false
      console.log('Redis disconnected')
    })

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...')
      this.isConnected = false
    })
  }
}
