/**
 * AI Request & Token Rate Limiter
 * Guards against accidental runaway loops and LLM billing spikes.
 * Supports sliding-window request-per-minute limits and daily token quotas per user.
 */

export interface AIQuotaStatus {
  requestsInLastMinute: number;
  maxRequestsPerMinute: number;
  tokensUsedToday: number;
  maxTokensPerDay: number;
  isAllowed: boolean;
  retryAfterSeconds?: number;
}

export class AIRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number = 60,
    public readonly limitType: 'RPM' | 'DAILY_TOKENS' = 'RPM'
  ) {
    super(message);
    this.name = 'AIRateLimitError';
  }
}

export interface AIRateLimiterConfig {
  maxRequestsPerMinute?: number;
  maxTokensPerDay?: number;
}

export class AIRateLimiter {
  private readonly maxRPM: number;
  private readonly maxDailyTokens: number;

  // In-memory sliding window storage: userId -> timestamps (ms)
  private requestTimestamps = new Map<string, number[]>();

  // In-memory daily token usage: `${userId}:${yyyy-mm-dd}` -> tokens
  private dailyTokens = new Map<string, number>();

  constructor(config: AIRateLimiterConfig = {}) {
    this.maxRPM = config.maxRequestsPerMinute ?? 20;
    this.maxDailyTokens = config.maxTokensPerDay ?? 100_000;
  }

  private getTodayKey(userId: string): string {
    const today = new Date().toISOString().split('T')[0];
    return `${userId}:${today}`;
  }

  /**
   * Cleans timestamps older than 60 seconds for a user
   */
  private cleanOldTimestamps(userId: string, now: number): number[] {
    const timestamps = this.requestTimestamps.get(userId) || [];
    const oneMinuteAgo = now - 60_000;
    const fresh = timestamps.filter((t) => t > oneMinuteAgo);
    this.requestTimestamps.set(userId, fresh);
    return fresh;
  }

  /**
   * Checks whether the user is permitted to make an AI request.
   * Throws AIRateLimitError if limits are breached.
   */
  async checkRateLimit(userId?: string): Promise<void> {
    if (!userId) {
      return; // Anonymous/system tasks without user context bypass user quotas
    }

    const now = Date.now();
    const freshTimestamps = this.cleanOldTimestamps(userId, now);

    // 1. Check Requests Per Minute (RPM)
    if (freshTimestamps.length >= this.maxRPM) {
      const oldestInWindow = freshTimestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + 60_000 - now) / 1000));
      throw new AIRateLimitError(
        `AI rate limit exceeded: Maximum ${this.maxRPM} requests per minute. Please try again in ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        'RPM'
      );
    }

    // 2. Check Daily Token Limit
    const todayKey = this.getTodayKey(userId);
    const tokensToday = this.dailyTokens.get(todayKey) || 0;
    if (tokensToday >= this.maxDailyTokens) {
      // Calculate seconds until midnight UTC
      const tomorrowMidnight = new Date();
      tomorrowMidnight.setUTCHours(24, 0, 0, 0);
      const retryAfterSeconds = Math.max(1, Math.ceil((tomorrowMidnight.getTime() - now) / 1000));

      throw new AIRateLimitError(
        `Daily AI token quota reached: You have consumed ${tokensToday.toLocaleString()} / ${this.maxDailyTokens.toLocaleString()} tokens today. Quota resets at midnight UTC.`,
        retryAfterSeconds,
        'DAILY_TOKENS'
      );
    }
  }

  /**
   * Records a successfully initiated or completed AI request
   */
  async recordUsage(userId?: string, tokensConsumed: number = 0): Promise<void> {
    if (!userId) {
      return;
    }

    const now = Date.now();
    const timestamps = this.cleanOldTimestamps(userId, now);
    timestamps.push(now);
    this.requestTimestamps.set(userId, timestamps);

    if (tokensConsumed > 0) {
      const todayKey = this.getTodayKey(userId);
      const current = this.dailyTokens.get(todayKey) || 0;
      this.dailyTokens.set(todayKey, current + tokensConsumed);
    }
  }

  /**
   * Returns current quota and usage status for a user
   */
  async getQuotaStatus(userId: string): Promise<AIQuotaStatus> {
    const now = Date.now();
    const freshTimestamps = this.cleanOldTimestamps(userId, now);
    const todayKey = this.getTodayKey(userId);
    const tokensToday = this.dailyTokens.get(todayKey) || 0;

    const isRpmOk = freshTimestamps.length < this.maxRPM;
    const isTokensOk = tokensToday < this.maxDailyTokens;

    let retryAfterSeconds: number | undefined;
    if (!isRpmOk && freshTimestamps.length > 0) {
      retryAfterSeconds = Math.max(1, Math.ceil((freshTimestamps[0] + 60_000 - now) / 1000));
    }

    return {
      requestsInLastMinute: freshTimestamps.length,
      maxRequestsPerMinute: this.maxRPM,
      tokensUsedToday: tokensToday,
      maxTokensPerDay: this.maxDailyTokens,
      isAllowed: isRpmOk && isTokensOk,
      retryAfterSeconds,
    };
  }

  /**
   * Clears in-memory history (useful for test resets)
   */
  reset(): void {
    this.requestTimestamps.clear();
    this.dailyTokens.clear();
  }
}
