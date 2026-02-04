/**
 * SharedWorker WebSocket Manager
 *
 * This worker runs in a separate thread that is NOT subject to browser throttling
 * when tabs are backgrounded. It maintains the WebSocket connection and forwards
 * messages between the server and connected tabs.
 *
 * Benefits:
 * - WebSocket stays alive even when all tabs are backgrounded (up to 5 minutes)
 * - Single connection shared across multiple tabs of the same origin
 * - Heartbeat/ping-pong continues working regardless of tab state
 *
 * Protocol:
 * Tab -> Worker: { type: 'connect', url: string }
 * Tab -> Worker: { type: 'disconnect' }
 * Tab -> Worker: { type: 'send', data: string }
 * Tab -> Worker: { type: 'visibility', visible: boolean }
 * Worker -> Tab: { type: 'open' }
 * Worker -> Tab: { type: 'close', code: number, reason: string }
 * Worker -> Tab: { type: 'message', data: string }
 * Worker -> Tab: { type: 'error', error: string }
 * Worker -> Tab: { type: 'state', state: ConnectionState }
 */

// Type definitions for SharedWorker environment
declare const self: SharedWorkerGlobalScope;

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface WorkerMessage {
  type: string;
  url?: string;
  data?: string;
  visible?: boolean;
  tabId?: string;
}

interface ConnectedPort {
  port: MessagePort;
  tabId: string;
  visible: boolean;
  lastActivity: number;
}

// Worker state
let socket: WebSocket | null = null;
let connectionState: ConnectionState = 'disconnected';
let currentUrl: string = '';
let reconnectAttempts: number = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalDisconnect: boolean = false;

// Connected tab ports
const connectedPorts: Map<string, ConnectedPort> = new Map();
let nextTabId: number = 0;

// Reconnection config
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// Activity tracking
let lastServerMessage: number = Date.now();
const STALE_CHECK_INTERVAL = 30000;

/**
 * Broadcast a message to all connected tabs.
 */
function broadcast(message: object): void {
  const json = JSON.stringify(message);
  for (const { port } of connectedPorts.values()) {
    try {
      port.postMessage(json);
    } catch {
      // Port might be closed
    }
  }
}

/**
 * Update and broadcast the connection state.
 */
function setState(newState: ConnectionState): void {
  if (connectionState !== newState) {
    console.log(`[SharedWorker] State: ${connectionState} -> ${newState}`);
    connectionState = newState;
    broadcast({ type: 'state', state: newState });
  }
}

/**
 * Check if any tab is visible.
 */
function anyTabVisible(): boolean {
  for (const { visible } of connectedPorts.values()) {
    if (visible) return true;
  }
  return false;
}

/**
 * Get count of connected tabs.
 */
function tabCount(): number {
  return connectedPorts.size;
}

/**
 * Schedule a reconnection attempt with exponential backoff.
 */
function scheduleReconnect(reason?: string): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log(`[SharedWorker] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    setState('failed');
    broadcast({
      type: 'reconnect-failed',
      attempt: reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      reason: reason || 'Max reconnection attempts reached',
    });
    return;
  }

  if (reconnectTimer !== null) {
    return; // Already scheduled
  }

  // Calculate delay with exponential backoff
  const baseDelay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
  const cappedDelay = Math.min(baseDelay, MAX_RECONNECT_DELAY);
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
  const finalDelay = Math.round(cappedDelay + jitter);

  reconnectAttempts++;
  setState('reconnecting');

  console.log(`[SharedWorker] Reconnect #${reconnectAttempts} scheduled in ${finalDelay}ms`);

  broadcast({
    type: 'reconnect-progress',
    attempt: reconnectAttempts,
    maxAttempts: MAX_RECONNECT_ATTEMPTS,
    delayMs: finalDelay,
    reason,
  });

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log(`[SharedWorker] Attempting reconnect #${reconnectAttempts}`);
    createConnection();
  }, finalDelay);
}

/**
 * Cancel any pending reconnection.
 */
function cancelReconnect(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Create the WebSocket connection.
 */
function createConnection(): void {
  if (!currentUrl) {
    console.error('[SharedWorker] No URL set for connection');
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('[SharedWorker] Socket already connected/connecting');
    return;
  }

  setState(reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
  broadcast({ type: 'connecting' });

  try {
    socket = new WebSocket(currentUrl);
    setupSocketHandlers();
  } catch (error) {
    console.error('[SharedWorker] Failed to create WebSocket:', error);
    broadcast({ type: 'error', error: `Failed to create connection: ${error}` });
    scheduleReconnect(`Connection error: ${error}`);
  }
}

/**
 * Set up WebSocket event handlers.
 */
function setupSocketHandlers(): void {
  if (!socket) return;

  socket.onopen = () => {
    console.log(`[SharedWorker] WebSocket opened at ${new Date().toISOString()}`);
    reconnectAttempts = 0;
    lastServerMessage = Date.now();
    setState('connected');
    broadcast({ type: 'open' });
  };

  socket.onclose = (event) => {
    console.log(`[SharedWorker] WebSocket closed: code=${event.code}, reason="${event.reason}"`);
    socket = null;

    broadcast({ type: 'close', code: event.code, reason: event.reason || `Code ${event.code}` });

    if (intentionalDisconnect) {
      console.log('[SharedWorker] Intentional disconnect, not reconnecting');
      setState('disconnected');
      return;
    }

    // Reconnect for any close unless intentional
    scheduleReconnect(event.reason || `Code ${event.code}`);
  };

  socket.onerror = (event) => {
    console.error('[SharedWorker] WebSocket error:', event);
    broadcast({ type: 'error', error: 'WebSocket error' });
  };

  socket.onmessage = (event) => {
    lastServerMessage = Date.now();
    // Forward raw message data to all tabs
    broadcast({ type: 'message', data: event.data });
  };
}

/**
 * Connect to the server.
 */
function connect(url: string): void {
  if (socket) {
    disconnect();
  }

  currentUrl = url;
  reconnectAttempts = 0;
  intentionalDisconnect = false;
  lastServerMessage = Date.now();

  createConnection();
}

/**
 * Disconnect from the server.
 */
function disconnect(): void {
  intentionalDisconnect = true;
  cancelReconnect();

  if (socket) {
    try {
      socket.close(1000, 'Client disconnect');
    } catch {
      // Ignore close errors
    }
    socket = null;
  }

  setState('disconnected');
}

/**
 * Send data through the WebSocket.
 */
function send(data: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log('[SharedWorker] Cannot send: socket not open');
    return false;
  }

  try {
    socket.send(data);
    return true;
  } catch (error) {
    console.error('[SharedWorker] Send error:', error);
    return false;
  }
}

/**
 * Handle a new tab connection.
 */
function handleConnect(port: MessagePort): void {
  const tabId = `tab-${nextTabId++}`;

  const connectedPort: ConnectedPort = {
    port,
    tabId,
    visible: true,
    lastActivity: Date.now(),
  };

  connectedPorts.set(tabId, connectedPort);
  console.log(`[SharedWorker] Tab connected: ${tabId} (${tabCount()} total)`);

  // Send current state to the new tab
  port.postMessage(JSON.stringify({ type: 'tabId', tabId }));
  port.postMessage(JSON.stringify({ type: 'state', state: connectionState }));

  // If we're already connected, send open event
  if (connectionState === 'connected') {
    port.postMessage(JSON.stringify({ type: 'open' }));
  }

  port.onmessage = (event) => {
    try {
      const message: WorkerMessage = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      connectedPort.lastActivity = Date.now();

      switch (message.type) {
        case 'connect':
          if (message.url) {
            connect(message.url);
          }
          break;

        case 'disconnect':
          disconnect();
          break;

        case 'send':
          if (message.data !== undefined) {
            const sent = send(message.data);
            if (!sent && connectionState === 'reconnecting') {
              // Let the tab know it should queue this message
              port.postMessage(JSON.stringify({ type: 'queue', data: message.data }));
            }
          }
          break;

        case 'visibility':
          if (message.visible !== undefined) {
            connectedPort.visible = message.visible;
            console.log(`[SharedWorker] Tab ${tabId} visibility: ${message.visible ? 'visible' : 'hidden'}`);

            // If a tab becomes visible and we were disconnected/failed, try to reconnect
            if (message.visible && (connectionState === 'failed' || connectionState === 'disconnected')) {
              console.log('[SharedWorker] Tab became visible, attempting reconnect');
              reconnectAttempts = 0;
              cancelReconnect();
              createConnection();
            }
          }
          break;

        case 'reconnect':
          // Manual reconnect request
          reconnectAttempts = 0;
          intentionalDisconnect = false;
          cancelReconnect();
          createConnection();
          break;

        case 'ping':
          // Health check from tab
          port.postMessage(JSON.stringify({ type: 'pong', state: connectionState }));
          break;

        default:
          console.log(`[SharedWorker] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[SharedWorker] Error handling message:', error);
    }
  };

  // Handle tab disconnection
  port.onmessageerror = () => {
    console.log(`[SharedWorker] Tab ${tabId} message error, removing`);
    connectedPorts.delete(tabId);
  };
}

/**
 * Check connection staleness periodically.
 * Note: The server does ping/pong, but we track message activity
 * to detect if we're not receiving anything.
 */
function checkStaleness(): void {
  const timeSinceLastMessage = Date.now() - lastServerMessage;

  // If we haven't received any message in 2 minutes, something is wrong
  if (connectionState === 'connected' && timeSinceLastMessage > 120000) {
    console.warn(`[SharedWorker] Connection stale: ${timeSinceLastMessage}ms since last message`);
    broadcast({ type: 'connection-stale' });

    // Force close and reconnect
    if (socket) {
      try {
        socket.close(4000, 'Connection stale');
      } catch {
        // Ignore
      }
      socket = null;
    }
    scheduleReconnect('Connection stale');
  }
}

// Start staleness checker
setInterval(checkStaleness, STALE_CHECK_INTERVAL);

// Clean up dead ports periodically
setInterval(() => {
  const now = Date.now();
  for (const [tabId, port] of connectedPorts.entries()) {
    // If a tab hasn't sent any message in 10 minutes, remove it
    if (now - port.lastActivity > 600000) {
      console.log(`[SharedWorker] Removing inactive tab: ${tabId}`);
      connectedPorts.delete(tabId);
    }
  }
}, 60000);

// SharedWorker connection handler
self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  handleConnect(port);
  port.start();
};

console.log('[SharedWorker] WebSocket worker initialized');
