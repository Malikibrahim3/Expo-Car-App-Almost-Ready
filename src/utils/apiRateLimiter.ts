/**
 * API Rate Limiter with Exponential Backoff
 * Prevents overwhelming external APIs and handles failures gracefully
 */

interface RateLimiterConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  requestsPerMinute: number;
}

interface RequestRecord {
  timestamp: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  requestsPerMinute: 30,
};

class ApiRateLimiter {
  private config: RateLimiterConfig;
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private retryCount: Map<string, number> = new Map();

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if we can make a request to this endpoint
   */
  canMakeRequest(endpoint: string): boolean {
    const history = this.requestHistory.get(endpoint) || [];
    const oneMinuteAgo = Date.now() - 60000;
    
    // Filter to only requests in the last minute
    const recentRequests = history.filter(r => r.timestamp > oneMinuteAgo);
    
    return recentRequests.length < this.config.requestsPerMinute;
  }

  /**
   * Record a request to an endpoint
   */
  recordRequest(endpoint: string): void {
    const history = this.requestHistory.get(endpoint) || [];
    history.push({ timestamp: Date.now() });
    
    // Keep only last 100 records to prevent memory bloat
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.requestHistory.set(endpoint, history);
  }

  /**
   * Get delay before next retry (exponential backoff)
   */
  getRetryDelay(endpoint: string): number {
    const retries = this.retryCount.get(endpoint) || 0;
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(2, retries),
      this.config.maxDelayMs
    );
    
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }

  /**
   * Increment retry count for an endpoint
   */
  incrementRetry(endpoint: string): number {
    const current = this.retryCount.get(endpoint) || 0;
    const newCount = current + 1;
    this.retryCount.set(endpoint, newCount);
    return newCount;
  }

  /**
   * Reset retry count for an endpoint (call on success)
   */
  resetRetry(endpoint: string): void {
    this.retryCount.delete(endpoint);
  }

  /**
   * Check if we should retry
   */
  shouldRetry(endpoint: string): boolean {
    const retries = this.retryCount.get(endpoint) || 0;
    return retries < this.config.maxRetries;
  }

  /**
   * Wait for the appropriate delay
   */
  async wait(endpoint: string): Promise<void> {
    const delay = this.getRetryDelay(endpoint);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Execute a request with rate limiting and retry logic
   */
  async executeWithRetry<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    options: { skipRateLimit?: boolean } = {}
  ): Promise<T> {
    // Check rate limit
    if (!options.skipRateLimit && !this.canMakeRequest(endpoint)) {
      const waitTime = 60000 - (Date.now() - (this.requestHistory.get(endpoint)?.[0]?.timestamp || 0));
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    while (true) {
      try {
        this.recordRequest(endpoint);
        const result = await requestFn();
        this.resetRetry(endpoint);
        return result;
      } catch (error: any) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        const status = error.status || error.statusCode;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        if (!this.shouldRetry(endpoint)) {
          throw new Error(`Max retries exceeded for ${endpoint}: ${error.message}`);
        }

        const retryCount = this.incrementRetry(endpoint);
        const delay = this.getRetryDelay(endpoint);
        
        console.log(`[RateLimiter] Retry ${retryCount}/${this.config.maxRetries} for ${endpoint} in ${delay}ms`);
        
        await this.wait(endpoint);
      }
    }
  }
}

// Export singleton instance for app-wide use
export const rateLimiter = new ApiRateLimiter();

// Export class for custom instances
export { ApiRateLimiter };
export type { RateLimiterConfig };
