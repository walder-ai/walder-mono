import { RateLimiter } from '../../shared/interfaces'

export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number
  private lastRefillTime: number
  private requestTimes: number[] = []

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private minRequestDelay: number = 100
  ) {
    this.tokens = maxTokens
    this.lastRefillTime = Date.now()
  }

  canExecute(): boolean {
    this.refillTokens()
    
    const now = Date.now()
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000)
    
    if (this.requestTimes.length >= this.maxTokens) {
      return false
    }
    
    if (this.tokens > 0) {
      const timeSinceLastRequest = this.requestTimes.length > 0 
        ? now - this.requestTimes[this.requestTimes.length - 1]
        : this.minRequestDelay
      
      return timeSinceLastRequest >= this.minRequestDelay
    }
    
    return false
  }

  waitTime(): number {
    if (!this.canExecute()) {
      const now = Date.now()
      
      if (this.requestTimes.length > 0) {
        const timeSinceLastRequest = now - this.requestTimes[this.requestTimes.length - 1]
        if (timeSinceLastRequest < this.minRequestDelay) {
          return this.minRequestDelay - timeSinceLastRequest
        }
      }
      
      if (this.requestTimes.length >= this.maxTokens && this.requestTimes.length > 0) {
        const oldestRequest = this.requestTimes[0]
        return Math.max(0, 60000 - (now - oldestRequest))
      }
      
      return Math.max(0, (60000 / this.refillRate) - (now - this.lastRefillTime))
    }
    
    return 0
  }

  markRequest(): void {
    if (this.canExecute()) {
      this.tokens--
      this.requestTimes.push(Date.now())
    }
  }

  private refillTokens(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefillTime
    const tokensToAdd = Math.floor((timePassed / 60000) * this.refillRate)
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
      this.lastRefillTime = now
    }
  }

  getStats(): { tokens: number; requestsInLastMinute: number; nextRefillTime: number } {
    this.refillTokens()
    const now = Date.now()
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000)
    
    return {
      tokens: this.tokens,
      requestsInLastMinute: this.requestTimes.length,
      nextRefillTime: this.lastRefillTime + (60000 / this.refillRate)
    }
  }
} 