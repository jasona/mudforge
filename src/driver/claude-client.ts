/**
 * Claude API Client for AI-powered features.
 * Provides rate limiting, caching, and graceful error handling.
 */

import { createHash } from 'crypto';

export interface ClaudeClientConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  systemPrompt?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  success: boolean;
  content?: string;
  error?: string;
  cached?: boolean;
  tokensUsed?: number;
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | string;
  truncated?: boolean;
}

interface CacheEntry {
  response: string;
  expires: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export class ClaudeClient {
  private config: ClaudeClientConfig;
  private requestTimestamps: Map<string, number[]> = new Map();
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: Partial<ClaudeClientConfig>) {
    this.config = {
      apiKey: config.apiKey ?? '',
      model: config.model ?? 'claude-sonnet-4-20250514',
      maxTokens: config.maxTokens ?? 1024,
      rateLimitPerMinute: config.rateLimitPerMinute ?? 20,
      cacheTtlMs: config.cacheTtlMs ?? 300000,
    };
  }

  /**
   * Check if the client is configured with an API key.
   */
  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  /**
   * Check rate limit for an identifier (e.g., player name).
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
  private getCacheKey(request: ClaudeRequest): string {
    return createHash('md5')
      .update(
        JSON.stringify({
          system: request.systemPrompt,
          messages: request.messages.slice(-2), // Only last exchange for cache key
        })
      )
      .digest('hex');
  }

  /**
   * Get a cached response if available.
   */
  private getFromCache(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  /**
   * Truncate content gracefully at a sentence boundary.
   */
  private truncateGracefully(content: string): string {
    // Look for the last sentence-ending punctuation
    const sentenceEnders = ['. ', '! ', '? ', '."', '!"', '?"', ".'", "!'", "?'"];
    let lastEnd = -1;

    for (const ender of sentenceEnders) {
      const pos = content.lastIndexOf(ender);
      if (pos > lastEnd) {
        lastEnd = pos + ender.length - 1; // Include the punctuation, not the space
      }
    }

    // If we found a sentence boundary in the last half of the text, use it
    if (lastEnd > content.length * 0.5) {
      return content.substring(0, lastEnd).trim();
    }

    // Otherwise, try to end at a comma or other natural break
    const breakChars = [', ', '; ', ' - ', '— '];
    for (const brk of breakChars) {
      const pos = content.lastIndexOf(brk);
      if (pos > content.length * 0.7) {
        return content.substring(0, pos).trim() + '...';
      }
    }

    // Last resort: just add ellipsis
    return content.trim() + '...';
  }

  /**
   * Store a response in the cache.
   */
  private setCache(key: string, response: string): void {
    // Periodic cache cleanup
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now > v.expires) this.cache.delete(k);
      }
    }

    this.cache.set(key, {
      response,
      expires: Date.now() + this.config.cacheTtlMs,
    });
  }

  /**
   * Make a completion request to Claude API.
   */
  async complete(request: ClaudeRequest): Promise<ClaudeResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Claude API not configured' };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { success: true, content: cached, cached: true };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: request.maxTokens ?? this.config.maxTokens,
          system: request.systemPrompt,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } };
        return {
          success: false,
          error: errorData.error?.message ?? `API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
        usage?: { output_tokens?: number };
        stop_reason?: string;
      };

      const textContent = data.content.find((c) => c.type === 'text');
      if (!textContent?.text) {
        return { success: false, error: 'No text content in response' };
      }

      let content = textContent.text;
      const stopReason = data.stop_reason;
      const truncated = stopReason === 'max_tokens';

      // If truncated, try to end gracefully at a sentence boundary
      if (truncated && content.length > 50) {
        content = this.truncateGracefully(content);
      }

      // Cache successful response
      this.setCache(cacheKey, content);

      const result: ClaudeResponse = {
        success: true,
        content,
        stopReason,
        truncated,
      };
      if (data.usage?.output_tokens !== undefined) {
        result.tokensUsed = data.usage.output_tokens;
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `API request failed: ${message}` };
    }
  }

  /**
   * Convenience method for context-based completion.
   */
  async completeWithContext(
    context: string,
    userMessage: string,
    conversationHistory?: ClaudeMessage[]
  ): Promise<ClaudeResponse> {
    const messages: ClaudeMessage[] = conversationHistory
      ? [...conversationHistory, { role: 'user', content: userMessage }]
      : [{ role: 'user', content: userMessage }];

    return this.complete({
      systemPrompt: context,
      messages,
    });
  }

  /**
   * Make a completion request with automatic continuation for long responses.
   * Will continue generating if the response was truncated due to max_tokens.
   * @param request The initial request
   * @param maxContinuations Maximum number of continuation requests (default: 2)
   */
  async completeWithContinuation(
    request: ClaudeRequest,
    maxContinuations: number = 2
  ): Promise<ClaudeResponse> {
    let fullContent = '';
    let continuations = 0;
    let lastResult: ClaudeResponse;
    const messages = [...request.messages];

    do {
      lastResult = await this.complete({
        ...request,
        messages,
      });

      if (!lastResult.success || !lastResult.content) {
        // If we have partial content, return that
        if (fullContent) {
          return {
            success: true,
            content: this.truncateGracefully(fullContent),
            truncated: true,
          };
        }
        return lastResult;
      }

      fullContent += lastResult.content;

      // If not truncated, we're done
      if (!lastResult.truncated) {
        return {
          ...lastResult,
          content: fullContent,
        };
      }

      // Prepare for continuation
      continuations++;
      if (continuations < maxContinuations) {
        // Add the partial response as assistant message and ask to continue
        messages.push({ role: 'assistant', content: lastResult.content });
        messages.push({ role: 'user', content: 'Continue from where you left off.' });
      }
    } while (lastResult.truncated && continuations < maxContinuations);

    // Ran out of continuations, return what we have
    return {
      success: true,
      content: this.truncateGracefully(fullContent),
      truncated: true,
      tokensUsed: lastResult.tokensUsed,
    };
  }

  /**
   * Make a rate-limited request.
   */
  async completeWithRateLimit(
    identifier: string,
    request: ClaudeRequest
  ): Promise<ClaudeResponse & { rateLimited?: boolean; retryAfter?: number }> {
    const rateCheck = this.checkRateLimit(identifier);
    if (!rateCheck.allowed) {
      const result: ClaudeResponse & { rateLimited?: boolean; retryAfter?: number } = {
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
    return this.complete(request);
  }
}

// Singleton instance
let clientInstance: ClaudeClient | null = null;

/**
 * Get the Claude client instance.
 */
export function getClaudeClient(): ClaudeClient | null {
  return clientInstance;
}

/**
 * Initialize the Claude client with configuration.
 */
export function initializeClaudeClient(config: Partial<ClaudeClientConfig>): ClaudeClient {
  clientInstance = new ClaudeClient(config);
  return clientInstance;
}
