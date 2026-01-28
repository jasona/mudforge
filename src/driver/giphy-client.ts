/**
 * Giphy API Client for GIF sharing on channels.
 * Provides rate limiting, caching, and graceful error handling.
 */

export interface GiphyClientConfig {
  apiKey: string;
  rating: string;           // g, pg, pg-13, r
  rateLimitPerMinute: number;
  cacheTtlMs: number;
}

export interface GiphySearchResult {
  success: boolean;
  url?: string;      // GIF URL (fixed_height variant)
  title?: string;    // GIF title
  error?: string;
}

export interface CachedGif {
  url: string;
  title: string;
  senderName: string;
  channelName: string;
  query: string;
  expiresAt: number;  // TTL: 1 hour
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export class GiphyClient {
  private config: GiphyClientConfig;
  private requestTimestamps: Map<string, number[]> = new Map();
  private gifCache: Map<string, CachedGif> = new Map();
  private searchCache: Map<string, { result: GiphySearchResult; expires: number }> = new Map();

  constructor(config: Partial<GiphyClientConfig>) {
    this.config = {
      apiKey: config.apiKey ?? '',
      rating: config.rating ?? 'pg',
      rateLimitPerMinute: config.rateLimitPerMinute ?? 3,
      cacheTtlMs: config.cacheTtlMs ?? 300000, // 5 minutes for search cache
    };
  }

  /**
   * Check if the client is configured with an API key.
   */
  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  /**
   * Check rate limit for a player identifier.
   */
  checkRateLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const timestamps = this.requestTimestamps.get(identifier) || [];

    // Clean old timestamps
    const recent = timestamps.filter((t) => now - t < windowMs);
    this.requestTimestamps.set(identifier, recent);

    if (recent.length >= this.config.rateLimitPerMinute) {
      const oldestInWindow = recent[0] ?? now;
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Record a request for rate limiting.
   */
  private recordRequest(identifier: string): void {
    const timestamps = this.requestTimestamps.get(identifier) || [];
    timestamps.push(Date.now());
    this.requestTimestamps.set(identifier, timestamps);
  }

  /**
   * Get a cached search result if available.
   */
  private getSearchFromCache(query: string): GiphySearchResult | null {
    const key = query.toLowerCase().trim();
    const entry = this.searchCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.searchCache.delete(key);
      return null;
    }
    return entry.result;
  }

  /**
   * Store a search result in the cache.
   */
  private setSearchCache(query: string, result: GiphySearchResult): void {
    const key = query.toLowerCase().trim();

    // Periodic cache cleanup
    if (this.searchCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.searchCache) {
        if (now > v.expires) this.searchCache.delete(k);
      }
    }

    this.searchCache.set(key, {
      result,
      expires: Date.now() + this.config.cacheTtlMs,
    });
  }

  /**
   * Search for a GIF on Giphy.
   * @param query The search query
   * @param playerIdentifier Identifier for rate limiting
   */
  async search(query: string, playerIdentifier: string): Promise<GiphySearchResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Giphy API not configured' };
    }

    // Sanitize query
    const sanitizedQuery = query.trim().substring(0, 100);
    if (!sanitizedQuery) {
      return { success: false, error: 'Search query is empty' };
    }

    // Check cache first
    const cached = this.getSearchFromCache(sanitizedQuery);
    if (cached) {
      return cached;
    }

    // Check rate limit
    const rateCheck = this.checkRateLimit(playerIdentifier);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `You've shared too many GIFs. Try again in ${rateCheck.retryAfter ?? 60} seconds.`,
      };
    }

    // Record the request
    this.recordRequest(playerIdentifier);

    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        q: sanitizedQuery,
        limit: '1',
        rating: this.config.rating,
      });

      // Add 25s timeout to prevent blocking event loop and failing health checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response: Response;
      try {
        response = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        return {
          success: false,
          error: `Giphy API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        data: Array<{
          title?: string;
          images?: {
            fixed_height?: {
              url?: string;
            };
          };
        }>;
      };

      if (!data.data || data.data.length === 0) {
        const result: GiphySearchResult = {
          success: false,
          error: `No GIFs found for '${sanitizedQuery}'`,
        };
        // Don't cache "not found" results for long
        return result;
      }

      const gif = data.data[0];
      const url = gif?.images?.fixed_height?.url;

      if (!url) {
        return {
          success: false,
          error: 'Invalid response from Giphy',
        };
      }

      // Validate URL is from Giphy domain
      if (!url.includes('giphy.com')) {
        return {
          success: false,
          error: 'Invalid GIF source',
        };
      }

      const result: GiphySearchResult = {
        success: true,
        url,
        title: gif?.title ?? sanitizedQuery,
      };

      // Cache successful result
      this.setSearchCache(sanitizedQuery, result);

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'GIF search timed out' };
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to fetch GIF: ${message}` };
    }
  }

  // ========== GIF Cache for clickable links ==========

  /**
   * Generate a unique ID for a GIF share.
   */
  generateGifId(): string {
    return `gif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Store a GIF in the cache for later retrieval.
   * @param id Unique GIF ID
   * @param data GIF data to cache
   */
  cacheGif(id: string, data: CachedGif): void {
    // Periodic cleanup
    if (this.gifCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.gifCache) {
        if (now > v.expiresAt) this.gifCache.delete(k);
      }
    }

    this.gifCache.set(id, data);
  }

  /**
   * Retrieve a cached GIF by ID.
   * @param id GIF ID to look up
   */
  getGifCache(id: string): CachedGif | undefined {
    const cached = this.gifCache.get(id);
    if (!cached) return undefined;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.gifCache.delete(id);
      return undefined;
    }

    return cached;
  }

  /**
   * Update the rate limit configuration.
   */
  setRateLimit(limit: number): void {
    this.config.rateLimitPerMinute = Math.max(1, Math.min(20, limit));
  }

  /**
   * Update the content rating configuration.
   */
  setRating(rating: string): void {
    const validRatings = ['g', 'pg', 'pg-13', 'r'];
    if (validRatings.includes(rating.toLowerCase())) {
      this.config.rating = rating.toLowerCase();
    }
  }
}

// Singleton instance
let clientInstance: GiphyClient | null = null;

/**
 * Get the Giphy client instance.
 */
export function getGiphyClient(): GiphyClient | null {
  return clientInstance;
}

/**
 * Initialize the Giphy client with configuration.
 */
export function initializeGiphyClient(config: Partial<GiphyClientConfig>): GiphyClient {
  clientInstance = new GiphyClient(config);
  return clientInstance;
}
