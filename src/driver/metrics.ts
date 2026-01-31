/**
 * Metrics - Performance instrumentation and monitoring.
 *
 * Provides timing histograms, counters, and slow operation tracking
 * to help identify performance bottlenecks.
 */

/**
 * Timing buckets for histogram (in milliseconds).
 */
const TIMING_BUCKETS = [1, 10, 50, 100, Infinity] as const;

/**
 * Timing histogram with bucket counts.
 */
export interface TimingHistogram {
  /** Count of operations in each bucket */
  buckets: number[];
  /** Bucket boundaries in ms */
  boundaries: readonly number[];
  /** Total count of operations */
  count: number;
  /** Sum of all operation times */
  sum: number;
  /** Minimum time observed */
  min: number;
  /** Maximum time observed */
  max: number;
}

/**
 * Slow operation entry for debugging.
 */
export interface SlowOperation {
  /** When this operation occurred */
  timestamp: number;
  /** Type of operation (heartbeat, callOut, command, efun) */
  type: 'heartbeat' | 'callOut' | 'command' | 'efun';
  /** Identifier (object path, command name, efun name) */
  identifier: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Complete metrics snapshot.
 */
export interface MetricsSnapshot {
  /** Heartbeat timing histogram */
  heartbeats: TimingHistogram;
  /** CallOut timing histogram */
  callOuts: TimingHistogram;
  /** Command timing histogram */
  commands: TimingHistogram;
  /** Per-efun timing histograms (when enabled) */
  efuns: Record<string, TimingHistogram>;
  /** Number of times an acquire had to wait for an isolate */
  isolateAcquireWaits: number;
  /** Number of isolates currently waiting in queue */
  isolateQueueLength: number;
  /** Number of backpressure events */
  backpressureEvents: number;
  /** Number of dropped messages due to backpressure */
  droppedMessages: number;
  /** Recent slow operations (>50ms) */
  slowOperations: SlowOperation[];
  /** When metrics collection started */
  startTime: number;
  /** Current time */
  currentTime: number;
  /** Whether detailed efun timing is enabled */
  efunTimingEnabled: boolean;
}

/**
 * Threshold for slow operations (ms).
 */
const SLOW_OPERATION_THRESHOLD_MS = 50;

/**
 * Maximum number of slow operations to keep.
 */
const MAX_SLOW_OPERATIONS = 100;

/**
 * Creates an empty timing histogram.
 */
function createHistogram(): TimingHistogram {
  return {
    buckets: TIMING_BUCKETS.map(() => 0),
    boundaries: TIMING_BUCKETS,
    count: 0,
    sum: 0,
    min: Infinity,
    max: 0,
  };
}

/**
 * Records a timing value into a histogram.
 */
function recordTiming(histogram: TimingHistogram, durationMs: number): void {
  histogram.count++;
  histogram.sum += durationMs;
  histogram.min = Math.min(histogram.min, durationMs);
  histogram.max = Math.max(histogram.max, durationMs);

  // Find bucket
  for (let i = 0; i < TIMING_BUCKETS.length; i++) {
    const bucket = TIMING_BUCKETS[i];
    if (bucket !== undefined && durationMs < bucket) {
      histogram.buckets[i] = (histogram.buckets[i] ?? 0) + 1;
      break;
    }
  }
}

/**
 * Calculate percentile from histogram.
 */
function percentile(histogram: TimingHistogram, p: number): number {
  if (histogram.count === 0) return 0;

  const target = Math.ceil(histogram.count * (p / 100));
  let cumulative = 0;

  for (let i = 0; i < histogram.buckets.length; i++) {
    const bucketCount = histogram.buckets[i] ?? 0;
    cumulative += bucketCount;
    if (cumulative >= target) {
      // Return upper bound of bucket (or estimated value)
      if (i === histogram.buckets.length - 1) {
        return histogram.max;
      }
      const boundary = histogram.boundaries[i];
      return boundary !== undefined ? boundary : histogram.max;
    }
  }

  return histogram.max;
}

/**
 * Calculate average from histogram.
 */
function average(histogram: TimingHistogram): number {
  if (histogram.count === 0) return 0;
  return histogram.sum / histogram.count;
}

/**
 * Metrics collector singleton.
 */
class MetricsCollector {
  private heartbeats: TimingHistogram = createHistogram();
  private callOuts: TimingHistogram = createHistogram();
  private commands: TimingHistogram = createHistogram();
  private efuns: Map<string, TimingHistogram> = new Map();

  private isolateAcquireWaits: number = 0;
  private isolateQueueLength: number = 0;
  private backpressureEvents: number = 0;
  private droppedMessages: number = 0;

  private slowOperations: SlowOperation[] = [];
  private startTime: number = Date.now();

  private efunTimingEnabled: boolean = false;

  /**
   * Record a heartbeat execution time.
   */
  recordHeartbeat(durationMs: number, objectPath: string): void {
    recordTiming(this.heartbeats, durationMs);
    this.maybeRecordSlow('heartbeat', objectPath, durationMs);
  }

  /**
   * Record a callOut execution time.
   */
  recordCallOut(durationMs: number, identifier: string): void {
    recordTiming(this.callOuts, durationMs);
    this.maybeRecordSlow('callOut', identifier, durationMs);
  }

  /**
   * Record a command execution time.
   */
  recordCommand(durationMs: number, commandName: string): void {
    recordTiming(this.commands, durationMs);
    this.maybeRecordSlow('command', commandName, durationMs);
  }

  /**
   * Record an efun execution time (only when enabled).
   */
  recordEfun(durationMs: number, efunName: string): void {
    if (!this.efunTimingEnabled) return;

    let histogram = this.efuns.get(efunName);
    if (!histogram) {
      histogram = createHistogram();
      this.efuns.set(efunName, histogram);
    }
    recordTiming(histogram, durationMs);
    this.maybeRecordSlow('efun', efunName, durationMs);
  }

  /**
   * Record an isolate acquire wait.
   */
  recordIsolateWait(): void {
    this.isolateAcquireWaits++;
  }

  /**
   * Update the current isolate queue length.
   */
  setIsolateQueueLength(length: number): void {
    this.isolateQueueLength = length;
  }

  /**
   * Record a backpressure event.
   */
  recordBackpressure(): void {
    this.backpressureEvents++;
  }

  /**
   * Record a dropped message.
   */
  recordDroppedMessage(): void {
    this.droppedMessages++;
  }

  /**
   * Enable or disable detailed efun timing.
   */
  setEfunTimingEnabled(enabled: boolean): void {
    this.efunTimingEnabled = enabled;
    if (!enabled) {
      // Clear efun timing data when disabled
      this.efuns.clear();
    }
  }

  /**
   * Check if efun timing is enabled.
   */
  isEfunTimingEnabled(): boolean {
    return this.efunTimingEnabled;
  }

  /**
   * Get a snapshot of all metrics.
   */
  getSnapshot(): MetricsSnapshot {
    const efunData: Record<string, TimingHistogram> = {};
    for (const [name, histogram] of this.efuns) {
      efunData[name] = { ...histogram, buckets: [...histogram.buckets] };
    }

    return {
      heartbeats: { ...this.heartbeats, buckets: [...this.heartbeats.buckets] },
      callOuts: { ...this.callOuts, buckets: [...this.callOuts.buckets] },
      commands: { ...this.commands, buckets: [...this.commands.buckets] },
      efuns: efunData,
      isolateAcquireWaits: this.isolateAcquireWaits,
      isolateQueueLength: this.isolateQueueLength,
      backpressureEvents: this.backpressureEvents,
      droppedMessages: this.droppedMessages,
      slowOperations: [...this.slowOperations],
      startTime: this.startTime,
      currentTime: Date.now(),
      efunTimingEnabled: this.efunTimingEnabled,
    };
  }

  /**
   * Get formatted metrics for display.
   */
  getFormattedMetrics(): {
    heartbeats: { avg: number; p95: number; p99: number; max: number; count: number };
    callOuts: { avg: number; p95: number; p99: number; max: number; count: number };
    commands: { avg: number; p95: number; p99: number; max: number; count: number };
    isolateAcquireWaits: number;
    isolateQueueLength: number;
    backpressureEvents: number;
    droppedMessages: number;
    slowOperations: SlowOperation[];
    uptimeMs: number;
  } {
    return {
      heartbeats: {
        avg: Math.round(average(this.heartbeats)),
        p95: Math.round(percentile(this.heartbeats, 95)),
        p99: Math.round(percentile(this.heartbeats, 99)),
        max: Math.round(this.heartbeats.max === 0 ? 0 : this.heartbeats.max),
        count: this.heartbeats.count,
      },
      callOuts: {
        avg: Math.round(average(this.callOuts)),
        p95: Math.round(percentile(this.callOuts, 95)),
        p99: Math.round(percentile(this.callOuts, 99)),
        max: Math.round(this.callOuts.max === 0 ? 0 : this.callOuts.max),
        count: this.callOuts.count,
      },
      commands: {
        avg: Math.round(average(this.commands)),
        p95: Math.round(percentile(this.commands, 95)),
        p99: Math.round(percentile(this.commands, 99)),
        max: Math.round(this.commands.max === 0 ? 0 : this.commands.max),
        count: this.commands.count,
      },
      isolateAcquireWaits: this.isolateAcquireWaits,
      isolateQueueLength: this.isolateQueueLength,
      backpressureEvents: this.backpressureEvents,
      droppedMessages: this.droppedMessages,
      slowOperations: this.slowOperations.slice(-20), // Last 20
      uptimeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Clear all metrics.
   */
  clear(): void {
    this.heartbeats = createHistogram();
    this.callOuts = createHistogram();
    this.commands = createHistogram();
    this.efuns.clear();
    this.isolateAcquireWaits = 0;
    this.isolateQueueLength = 0;
    this.backpressureEvents = 0;
    this.droppedMessages = 0;
    this.slowOperations = [];
    this.startTime = Date.now();
  }

  /**
   * Record a slow operation if it exceeds threshold.
   */
  private maybeRecordSlow(
    type: SlowOperation['type'],
    identifier: string,
    durationMs: number
  ): void {
    if (durationMs >= SLOW_OPERATION_THRESHOLD_MS) {
      this.slowOperations.push({
        timestamp: Date.now(),
        type,
        identifier,
        durationMs,
      });

      // Keep only the most recent slow operations
      if (this.slowOperations.length > MAX_SLOW_OPERATIONS) {
        this.slowOperations = this.slowOperations.slice(-MAX_SLOW_OPERATIONS);
      }
    }
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

/**
 * Get the global metrics collector instance.
 */
export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

/**
 * Reset the global metrics collector. Used for testing.
 */
export function resetMetrics(): void {
  metricsInstance = null;
}
