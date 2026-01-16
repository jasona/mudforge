/**
 * LPC Codec - Encode/decode LPC (Lars Pensjö C) wire format for Intermud 3.
 *
 * LPC format used by I3:
 * - Strings: "escaped content" (with \n, \t, \\, \" escaping)
 * - Integers: literal numbers (e.g., 42, -5)
 * - Arrays: ({ elem1, elem2, })
 * - Mappings: ([ "key": value, "key2": value2, ])
 * - 0 represents null/undefined
 *
 * MudMode framing: 4-byte big-endian length + LPC string + null terminator
 */

/**
 * LPC data types supported by the codec.
 */
export type LPCValue = string | number | LPCValue[] | LPCMapping | null;

export interface LPCMapping {
  [key: string]: LPCValue;
}

/**
 * Encode a TypeScript value to LPC format string.
 */
export function encodeLPC(value: LPCValue): string {
  if (value === null || value === undefined) {
    return '0';
  }

  if (typeof value === 'number') {
    // Integers only - LPC doesn't have floats in I3
    return Math.floor(value).toString();
  }

  if (typeof value === 'string') {
    return encodeString(value);
  }

  if (Array.isArray(value)) {
    return encodeArray(value);
  }

  if (typeof value === 'object') {
    return encodeMapping(value as LPCMapping);
  }

  // Fallback for unexpected types
  return '0';
}

/**
 * Encode a string with proper escaping.
 */
function encodeString(str: string): string {
  let escaped = '';
  for (const char of str) {
    switch (char) {
      case '"':
        escaped += '\\"';
        break;
      case '\\':
        escaped += '\\\\';
        break;
      case '\n':
        escaped += '\\n';
        break;
      case '\r':
        escaped += '\\r';
        break;
      case '\t':
        escaped += '\\t';
        break;
      default:
        escaped += char;
    }
  }
  return `"${escaped}"`;
}

/**
 * Encode an array in LPC format: ({ elem1, elem2, })
 */
function encodeArray(arr: LPCValue[]): string {
  if (arr.length === 0) {
    return '({})';
  }
  const elements = arr.map((elem) => encodeLPC(elem)).join(',');
  return `({${elements},})`;
}

/**
 * Encode a mapping in LPC format: ([ "key": value, ])
 */
function encodeMapping(obj: LPCMapping): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '([])';
  }
  const pairs = keys.map((key) => `${encodeString(key)}:${encodeLPC(obj[key] ?? null)}`).join(',');
  return `([${pairs},])`;
}

/**
 * Decode an LPC format string to TypeScript value.
 */
export function decodeLPC(data: string): LPCValue {
  const parser = new LPCParser(data);
  return parser.parse();
}

/**
 * Parser for LPC format strings.
 */
class LPCParser {
  private pos = 0;
  private data: string;

  constructor(data: string) {
    this.data = data;
  }

  parse(): LPCValue {
    this.skipWhitespace();
    return this.parseValue();
  }

  private parseValue(): LPCValue {
    this.skipWhitespace();

    if (this.pos >= this.data.length) {
      return null;
    }

    const char = this.data[this.pos];
    if (char === undefined) {
      return null;
    }

    // String
    if (char === '"') {
      return this.parseString();
    }

    // Array: ({
    if (char === '(' && this.peek(1) === '{') {
      return this.parseArray();
    }

    // Mapping: ([
    if (char === '(' && this.peek(1) === '[') {
      return this.parseMapping();
    }

    // Number (including negative)
    if (char === '-' || (char >= '0' && char <= '9')) {
      return this.parseNumber();
    }

    // Unknown - treat as 0
    return null;
  }

  private parseString(): string {
    this.expect('"');
    let result = '';

    while (this.pos < this.data.length) {
      const char = this.data[this.pos];

      if (char === '"') {
        this.pos++;
        return result;
      }

      if (char === '\\' && this.pos + 1 < this.data.length) {
        this.pos++;
        const escaped = this.data[this.pos];
        switch (escaped) {
          case 'n':
            result += '\n';
            break;
          case 'r':
            result += '\r';
            break;
          case 't':
            result += '\t';
            break;
          case '"':
            result += '"';
            break;
          case '\\':
            result += '\\';
            break;
          default:
            result += escaped;
        }
        this.pos++;
        continue;
      }

      result += char;
      this.pos++;
    }

    // Unterminated string
    return result;
  }

  private parseArray(): LPCValue[] {
    this.expect('(');
    this.expect('{');

    const result: LPCValue[] = [];

    this.skipWhitespace();

    // Empty array
    if (this.data[this.pos] === '}') {
      this.pos++;
      this.expect(')');
      return result;
    }

    while (this.pos < this.data.length) {
      this.skipWhitespace();

      // End of array
      if (this.data[this.pos] === '}') {
        this.pos++;
        this.expect(')');
        return result;
      }

      // Parse element
      const value = this.parseValue();
      result.push(value);

      this.skipWhitespace();

      // Skip comma if present
      if (this.data[this.pos] === ',') {
        this.pos++;
      }
    }

    return result;
  }

  private parseMapping(): LPCMapping {
    this.expect('(');
    this.expect('[');

    const result: LPCMapping = {};

    this.skipWhitespace();

    // Empty mapping
    if (this.data[this.pos] === ']') {
      this.pos++;
      this.expect(')');
      return result;
    }

    while (this.pos < this.data.length) {
      this.skipWhitespace();

      // End of mapping
      if (this.data[this.pos] === ']') {
        this.pos++;
        this.expect(')');
        return result;
      }

      // Parse key (must be string)
      const key = this.parseString();

      this.skipWhitespace();
      this.expect(':');
      this.skipWhitespace();

      // Parse value
      const value = this.parseValue();
      result[key] = value;

      this.skipWhitespace();

      // Skip comma if present
      if (this.data[this.pos] === ',') {
        this.pos++;
      }
    }

    return result;
  }

  private parseNumber(): number {
    let numStr = '';

    // Handle negative
    if (this.data[this.pos] === '-') {
      numStr += '-';
      this.pos++;
    }

    // Parse digits
    while (this.pos < this.data.length) {
      const char = this.data[this.pos];
      if (char !== undefined && char >= '0' && char <= '9') {
        numStr += char;
        this.pos++;
      } else {
        break;
      }
    }

    return parseInt(numStr, 10) || 0;
  }

  private skipWhitespace(): void {
    while (this.pos < this.data.length) {
      const char = this.data[this.pos];
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        this.pos++;
      } else {
        break;
      }
    }
  }

  private expect(char: string): void {
    if (this.data[this.pos] === char) {
      this.pos++;
    }
  }

  private peek(offset: number): string | undefined {
    return this.data[this.pos + offset];
  }
}

/**
 * Encode a complete I3 packet with MudMode framing.
 * Returns Buffer with 4-byte big-endian length header + LPC string + null terminator.
 */
export function encodePacket(packet: LPCValue[]): Buffer {
  const lpcString = encodeLPC(packet);
  // Length includes the null terminator
  const length = Buffer.byteLength(lpcString, 'utf8') + 1;

  const buffer = Buffer.alloc(4 + length);
  buffer.writeUInt32BE(length, 0);
  buffer.write(lpcString, 4, 'utf8');
  buffer[buffer.length - 1] = 0; // Null terminator

  return buffer;
}

/**
 * Decode a MudMode packet data (after length header is stripped).
 * Expects the data to be null-terminated LPC string.
 */
export function decodePacket(data: Buffer): LPCValue[] {
  // Remove null terminator if present
  let str = data.toString('utf8');
  if (str.endsWith('\0')) {
    str = str.slice(0, -1);
  }

  const result = decodeLPC(str);

  // I3 packets are always arrays
  if (Array.isArray(result)) {
    return result;
  }

  return [];
}

/**
 * MudMode frame reader - accumulates data and extracts complete packets.
 */
export class MudModeReader {
  private buffer: Buffer = Buffer.alloc(0);

  /**
   * Add received data to the buffer.
   * Returns an array of complete packets that can be decoded.
   */
  addData(data: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const packets: Buffer[] = [];

    while (this.buffer.length >= 4) {
      // Read length header
      const length = this.buffer.readUInt32BE(0);

      // Check if we have the complete packet
      if (this.buffer.length < 4 + length) {
        break;
      }

      // Extract packet data (without length header)
      const packetData = this.buffer.subarray(4, 4 + length);
      packets.push(Buffer.from(packetData));

      // Remove processed data from buffer
      this.buffer = this.buffer.subarray(4 + length);
    }

    return packets;
  }

  /**
   * Reset the buffer (e.g., on reconnect).
   */
  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
