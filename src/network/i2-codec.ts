/**
 * I2 Codec - Encode/decode Intermud 2 UDP message format.
 *
 * I2 message format:
 * @@@command||Param1:Value1||Param2:Value2@@@
 *
 * Parameters are separated by || and key:value pairs use :
 * Subparameters within a value use | as delimiter
 */

/**
 * I2 message structure.
 */
export interface I2Message {
  command: string;
  params: Record<string, string | string[]>;
}

/**
 * Standard I2 parameter names.
 */
export const I2Params = {
  NAME: 'NAME',           // MUD name
  HOST: 'HOST',           // Hostname
  HOSTADDRESS: 'HOSTADDRESS', // IP address
  PORT: 'PORT',           // Game port
  PORTUDP: 'PORTUDP',     // UDP port
  WIZNAME: 'WIZNAME',     // Wizard name (sender)
  WIZFROM: 'WIZFROM',     // From wizard
  WIZTO: 'WIZTO',         // To wizard
  MSG: 'MSG',             // Message content
  DATE: 'DATE',           // Unix timestamp
  EMOTE: 'EMOTE',         // 0 or 1 for emote mode
  CHANNEL: 'CHANNEL',     // Channel name
  CMD: 'CMD',             // Sub-command
} as const;

/**
 * I2 command types.
 */
export const I2Commands = {
  // System
  STARTUP: 'startup',
  SHUTDOWN: 'shutdown',
  PING_Q: 'ping_q',
  PING_A: 'ping_a',
  MUDLIST_Q: 'mudlist_q',
  MUDLIST_A: 'mudlist_a',

  // Communication
  GTELL: 'gtell',
  AFFIRMATION_A: 'affirmation_a',
  GWIZMSG: 'gwizmsg',
  GCHANNEL: 'gchannel',

  // Query
  GFINGER_Q: 'gfinger_q',
  GFINGER_A: 'gfinger_a',
  LOCATE_Q: 'locate_q',
  LOCATE_A: 'locate_a',
  RWHO_Q: 'rwho_q',
  RWHO_A: 'rwho_a',
  SUPPORTED_Q: 'supported_q',
  SUPPORTED_A: 'supported_a',

  // Extended
  MAIL_Q: 'mail_q',
  MAIL_A: 'mail_a',
  WARNING: 'warning',
} as const;

/**
 * Encode an I2 message to string format.
 */
export function encodeI2Message(message: I2Message): string {
  const parts: string[] = [message.command];

  for (const [key, value] of Object.entries(message.params)) {
    if (Array.isArray(value)) {
      // Subparameters - join with |
      parts.push(`${key}:|${value.join('|')}`);
    } else {
      parts.push(`${key}:${value}`);
    }
  }

  return `@@@${parts.join('||')}@@@`;
}

/**
 * Decode an I2 message from string format.
 */
export function decodeI2Message(data: string): I2Message | null {
  // Trim and check for @@@...@@@ wrapper
  const trimmed = data.trim();

  if (!trimmed.startsWith('@@@') || !trimmed.endsWith('@@@')) {
    return null;
  }

  // Remove wrapper
  const content = trimmed.slice(3, -3);

  if (!content) {
    return null;
  }

  // Split by ||
  const parts = content.split('||');

  if (parts.length === 0 || !parts[0]) {
    return null;
  }

  const command = parts[0];
  const params: Record<string, string | string[]> = {};

  // Parse parameters
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      // No value, just a key
      params[part] = '';
      continue;
    }

    const key = part.slice(0, colonIndex);
    const value = part.slice(colonIndex + 1);

    // Check for subparameters (starts with |)
    if (value.startsWith('|')) {
      // Split subparameters
      params[key] = value.slice(1).split('|');
    } else {
      params[key] = value;
    }
  }

  return { command, params };
}

/**
 * Encode a message to a UDP buffer.
 */
export function encodeI2Packet(message: I2Message): Buffer {
  const str = encodeI2Message(message);
  return Buffer.from(str, 'utf8');
}

/**
 * Decode a UDP buffer to a message.
 */
export function decodeI2Packet(data: Buffer): I2Message | null {
  const str = data.toString('utf8');
  return decodeI2Message(str);
}

/**
 * Helper to get a string parameter value.
 */
export function getParam(message: I2Message, key: string): string | undefined {
  const value = message.params[key];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }
  return undefined;
}

/**
 * Helper to get an array parameter value.
 */
export function getArrayParam(message: I2Message, key: string): string[] {
  const value = message.params[key];
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  return [];
}

/**
 * Create a startup message.
 */
export function createStartupMessage(
  mudName: string,
  host: string,
  port: number,
  udpPort: number
): I2Message {
  return {
    command: I2Commands.STARTUP,
    params: {
      [I2Params.NAME]: mudName,
      [I2Params.HOST]: host,
      [I2Params.HOSTADDRESS]: host,
      [I2Params.PORT]: port.toString(),
      [I2Params.PORTUDP]: udpPort.toString(),
    },
  };
}

/**
 * Create a shutdown message.
 */
export function createShutdownMessage(mudName: string): I2Message {
  return {
    command: I2Commands.SHUTDOWN,
    params: {
      [I2Params.NAME]: mudName,
    },
  };
}

/**
 * Create a channel message.
 */
export function createChannelMessage(
  mudName: string,
  channel: string,
  wizName: string,
  message: string,
  isEmote: boolean = false
): I2Message {
  return {
    command: I2Commands.GCHANNEL,
    params: {
      [I2Params.NAME]: mudName,
      [I2Params.CHANNEL]: channel,
      [I2Params.WIZNAME]: wizName,
      [I2Params.MSG]: message,
      [I2Params.EMOTE]: isEmote ? '1' : '0',
    },
  };
}

/**
 * Create a tell message.
 */
export function createTellMessage(
  mudName: string,
  fromWiz: string,
  toMud: string,
  toWiz: string,
  message: string
): I2Message {
  return {
    command: I2Commands.GTELL,
    params: {
      [I2Params.NAME]: mudName,
      [I2Params.WIZFROM]: fromWiz,
      [I2Params.WIZTO]: `${toWiz}@${toMud}`,
      [I2Params.MSG]: message,
    },
  };
}

/**
 * Create a who request.
 */
export function createWhoRequest(mudName: string, targetMud: string): I2Message {
  return {
    command: I2Commands.RWHO_Q,
    params: {
      [I2Params.NAME]: mudName,
    },
  };
}

/**
 * Create a mudlist request.
 */
export function createMudlistRequest(mudName: string): I2Message {
  return {
    command: I2Commands.MUDLIST_Q,
    params: {
      [I2Params.NAME]: mudName,
    },
  };
}

/**
 * Create a ping request.
 */
export function createPingRequest(mudName: string): I2Message {
  return {
    command: I2Commands.PING_Q,
    params: {
      [I2Params.NAME]: mudName,
    },
  };
}

/**
 * Create a ping response.
 */
export function createPingResponse(
  mudName: string,
  host: string,
  port: number,
  udpPort: number
): I2Message {
  return {
    command: I2Commands.PING_A,
    params: {
      [I2Params.NAME]: mudName,
      [I2Params.HOST]: host,
      [I2Params.HOSTADDRESS]: host,
      [I2Params.PORT]: port.toString(),
      [I2Params.PORTUDP]: udpPort.toString(),
    },
  };
}
