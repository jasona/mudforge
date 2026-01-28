/**
 * Gemini API Client for AI-powered image generation (Nano Banana).
 * Uses Google's Gemini 2.5 Flash Image model for NPC portrait generation.
 */

import { createHash } from 'crypto';

export interface GeminiClientConfig {
  apiKey: string;
  model: string;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
}

export interface GeminiImageRequest {
  prompt: string;
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  resolution?: '1K' | '2K' | '4K';
}

export interface GeminiImageResponse {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
  cached?: boolean;
}

interface CacheEntry {
  imageBase64: string;
  mimeType: string;
  expires: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export class GeminiClient {
  private config: GeminiClientConfig;
  private requestTimestamps: Map<string, number[]> = new Map();
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: Partial<GeminiClientConfig>) {
    this.config = {
      apiKey: config.apiKey ?? '',
      model: config.model ?? 'gemini-2.5-flash-image',
      rateLimitPerMinute: config.rateLimitPerMinute ?? 10,
      cacheTtlMs: config.cacheTtlMs ?? 3600000, // 1 hour default for images
    };
  }

  /**
   * Check if the client is configured with an API key.
   */
  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  /**
   * Check rate limit for an identifier.
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
   * Generate a cache key for a request.
   */
  private getCacheKey(request: GeminiImageRequest): string {
    return createHash('md5')
      .update(
        JSON.stringify({
          prompt: request.prompt,
          aspectRatio: request.aspectRatio,
          resolution: request.resolution,
        })
      )
      .digest('hex');
  }

  /**
   * Get a cached response if available.
   */
  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Store a response in the cache.
   */
  private setCache(key: string, imageBase64: string, mimeType: string): void {
    // Periodic cache cleanup
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now > v.expires) this.cache.delete(k);
      }
    }

    this.cache.set(key, {
      imageBase64,
      mimeType,
      expires: Date.now() + this.config.cacheTtlMs,
    });
  }

  /**
   * Generate an image using Gemini's Nano Banana model.
   */
  async generateImage(request: GeminiImageRequest): Promise<GeminiImageResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Gemini API not configured' };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        imageBase64: cached.imageBase64,
        mimeType: cached.mimeType,
        cached: true,
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

      const body: {
        contents: Array<{ parts: Array<{ text: string }> }>;
        generationConfig: {
          responseModalities: string[];
        };
      } = {
        contents: [
          {
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      };

      // Add 25s timeout to prevent blocking event loop and failing health checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } };
        return {
          success: false,
          error: errorData.error?.message ?? `API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              inlineData?: {
                mimeType: string;
                data: string;
              };
            }>;
          };
        }>;
        error?: { message?: string };
      };

      if (data.error) {
        return {
          success: false,
          error: data.error.message ?? 'Unknown API error',
        };
      }

      // Find the image part in the response
      const parts = data.candidates?.[0]?.content?.parts;
      if (!parts) {
        return { success: false, error: 'No content in response' };
      }

      const imagePart = parts.find((p) => p.inlineData);
      if (!imagePart?.inlineData) {
        return { success: false, error: 'No image generated' };
      }

      const { mimeType, data: imageBase64 } = imagePart.inlineData;

      // Cache the result
      this.setCache(cacheKey, imageBase64, mimeType);

      return {
        success: true,
        imageBase64,
        mimeType,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'API request timed out' };
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `API request failed: ${message}` };
    }
  }

  /**
   * Generate an image with rate limiting.
   */
  async generateImageWithRateLimit(
    identifier: string,
    request: GeminiImageRequest
  ): Promise<GeminiImageResponse & { rateLimited?: boolean; retryAfter?: number }> {
    const rateCheck = this.checkRateLimit(identifier);
    if (!rateCheck.allowed) {
      const result: GeminiImageResponse & { rateLimited?: boolean; retryAfter?: number } = {
        success: false,
        error: `Rate limited. Try again in ${rateCheck.retryAfter ?? 60} seconds.`,
        rateLimited: true,
      };
      if (rateCheck.retryAfter !== undefined) {
        result.retryAfter = rateCheck.retryAfter;
      }
      return result;
    }

    this.recordRequest(identifier);
    return this.generateImage(request);
  }
}

// Singleton instance
let clientInstance: GeminiClient | null = null;

/**
 * Get the Gemini client instance.
 */
export function getGeminiClient(): GeminiClient | null {
  return clientInstance;
}

/**
 * Initialize the Gemini client with configuration.
 */
export function initializeGeminiClient(config: Partial<GeminiClientConfig>): GeminiClient {
  clientInstance = new GeminiClient(config);
  return clientInstance;
}
