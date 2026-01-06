/**
 * Login Daemon - Handles player authentication and character creation.
 *
 * This daemon is invoked by the driver when a new connection is established.
 * It guides the user through login or character creation.
 */

import { MudObject } from '../std/object.js';
import { Player, type PlayerSaveData } from '../std/player.js';
import { getChannelDaemon } from './channels.js';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import * as dns from 'dns';

const scryptAsync = promisify(scrypt);
const dnsReverse = promisify(dns.reverse);

/**
 * Resolve an IP address to a hostname.
 * Returns the hostname if found, or null if resolution fails.
 */
async function resolveHostname(ip: string): Promise<string | null> {
  // Skip resolution for localhost/loopback addresses
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return 'localhost';
  }

  // Skip resolution for unknown addresses
  if (ip === 'unknown' || !ip) {
    return null;
  }

  try {
    const hostnames = await dnsReverse(ip);
    return hostnames[0] || null;
  } catch {
    // DNS resolution failed (common for many IPs)
    return null;
  }
}

/**
 * Hash a password using scrypt.
 * Returns format: salt:hash (both hex encoded)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a stored hash.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(hashBuffer, derivedKey);
}

/**
 * Player save data from persistence layer.
 */
interface PlayerSaveData {
  name: string;
  location: string;
  state: {
    properties: Record<string, unknown>;
  };
  savedAt: number;
}

/**
 * Connection interface.
 */
export interface Connection {
  send(message: string): void;
  close(): void;
  isConnected(): boolean;
  getRemoteAddress(): string;
}

/**
 * Login state machine states.
 */
type LoginState = 'name' | 'password' | 'confirm_password' | 'email' | 'gender' | 'playing';

/**
 * Login session data.
 */
interface LoginSession {
  connection: Connection;
  state: LoginState;
  name: string;
  password: string;
  email: string;
  isNewPlayer: boolean;
  savedData?: PlayerSaveData; // Loaded save data for existing players
}

/**
 * Login Daemon class.
 */
export class LoginDaemon extends MudObject {
  private _sessions: Map<Connection, LoginSession> = new Map();

  // In-memory fallback for testing (when efuns not available)
  private _passwords: Map<string, string> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Login Daemon';
    this.longDesc = 'The login daemon handles player authentication.';
  }

  /**
   * Start a login session for a new connection.
   * @param connection The new connection
   */
  startSession(connection: Connection): void {
    const session: LoginSession = {
      connection,
      state: 'name',
      name: '',
      password: '',
      email: '',
      isNewPlayer: false,
    };

    this._sessions.set(connection, session);

    // Send welcome banner
    this.sendBanner(connection);
    connection.send('\nBy what name do you wish to be known? ');
  }

  /**
   * Process input from a connection in a login session.
   * @param connection The connection
   * @param input The input received
   */
  async processInput(connection: Connection, input: string): Promise<void> {
    const session = this._sessions.get(connection);
    if (!session) {
      connection.send('Session error. Please reconnect.\n');
      connection.close();
      return;
    }

    const trimmed = input.trim();

    switch (session.state) {
      case 'name':
        await this.handleName(session, trimmed);
        break;
      case 'password':
        await this.handlePassword(session, trimmed);
        break;
      case 'confirm_password':
        await this.handleConfirmPassword(session, trimmed);
        break;
      case 'email':
        await this.handleEmail(session, trimmed);
        break;
      case 'gender':
        await this.handleGender(session, trimmed);
        break;
    }
  }

  /**
   * Send the welcome banner.
   */
  private sendBanner(connection: Connection): void {
    const banner = `
================================================================================
                      Welcome to MudForge
                  A Modern MUD Experience
================================================================================

`;
    connection.send(banner);
  }

  /**
   * Handle name input.
   */
  private async handleName(session: LoginSession, name: string): Promise<void> {
    // Validate name
    if (!this.isValidName(name)) {
      session.connection.send('Invalid name. Names must be 3-16 characters, letters only.\n');
      session.connection.send('By what name do you wish to be known? ');
      return;
    }

    session.name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    // Check if player exists using persistence or in-memory fallback
    let playerExists = false;
    if (typeof efuns !== 'undefined' && efuns.playerExists) {
      // Use persistence system
      playerExists = await efuns.playerExists(session.name);
      if (playerExists && efuns.loadPlayerData) {
        session.savedData = (await efuns.loadPlayerData(session.name)) ?? undefined;
      }
    } else {
      // Fallback to in-memory (for testing)
      playerExists = this._passwords.has(session.name.toLowerCase());
    }

    if (playerExists) {
      session.isNewPlayer = false;
      session.connection.send(`Welcome back, ${session.name}.\nPassword: `);
    } else {
      session.isNewPlayer = true;
      session.connection.send(`${session.name} is a new character.\n`);
      session.connection.send('Please choose a password: ');
    }

    session.state = 'password';
  }

  /**
   * Handle password input.
   */
  private async handlePassword(session: LoginSession, password: string): Promise<void> {
    if (session.isNewPlayer) {
      // New player - validate password strength
      if (password.length < 6) {
        session.connection.send('Password must be at least 6 characters.\n');
        session.connection.send('Please choose a password: ');
        return;
      }

      session.password = password;
      session.connection.send('Please confirm your password: ');
      session.state = 'confirm_password';
    } else {
      // Existing player - verify password from saved data or in-memory fallback
      let storedHash: string | undefined;
      if (session.savedData?.state?.properties?.passwordHash) {
        // From persistence (hashed)
        storedHash = session.savedData.state.properties.passwordHash as string;
      } else if (session.savedData?.state?.properties?.password) {
        // Legacy: plain text password (will be upgraded on next save)
        const legacyPassword = session.savedData.state.properties.password as string;
        if (password !== legacyPassword) {
          session.connection.send('Incorrect password.\n');
          session.connection.send('Password: ');
          return;
        }
        // Password matches - will be upgraded to hash on login completion
        session.password = password;
        await this.completeLogin(session);
        return;
      } else {
        // From in-memory fallback (testing)
        storedHash = this._passwords.get(session.name.toLowerCase());
      }

      if (!storedHash) {
        session.connection.send('Incorrect password.\n');
        session.connection.send('Password: ');
        return;
      }

      // Verify the hashed password
      const isValid = await verifyPassword(password, storedHash);
      if (!isValid) {
        session.connection.send('Incorrect password.\n');
        session.connection.send('Password: ');
        return;
      }

      // Login successful
      await this.completeLogin(session);
    }
  }

  /**
   * Handle password confirmation for new players.
   */
  private async handleConfirmPassword(session: LoginSession, password: string): Promise<void> {
    if (password !== session.password) {
      session.connection.send('Passwords do not match.\n');
      session.connection.send('Please choose a password: ');
      session.state = 'password';
      return;
    }

    session.connection.send('What is your email address (for password recovery)? ');
    session.state = 'email';
  }

  /**
   * Handle email input.
   */
  private async handleEmail(session: LoginSession, email: string): Promise<void> {
    // Basic email validation
    if (email && !email.includes('@')) {
      session.connection.send('Invalid email address.\n');
      session.connection.send('What is your email address? ');
      return;
    }

    session.email = email;
    session.connection.send('\nWhat is your gender?\n');
    session.connection.send('1. Male\n');
    session.connection.send('2. Female\n');
    session.connection.send('3. Neutral\n');
    session.connection.send('Choice: ');
    session.state = 'gender';
  }

  /**
   * Handle gender selection.
   */
  private async handleGender(session: LoginSession, choice: string): Promise<void> {
    let gender: 'male' | 'female' | 'neutral';

    switch (choice.toLowerCase()) {
      case '1':
      case 'male':
      case 'm':
        gender = 'male';
        break;
      case '2':
      case 'female':
      case 'f':
        gender = 'female';
        break;
      case '3':
      case 'neutral':
      case 'n':
        gender = 'neutral';
        break;
      default:
        session.connection.send('Please choose 1, 2, or 3: ');
        return;
    }

    // Create the player
    await this.createPlayer(session, gender);
  }

  /**
   * Create a new player.
   */
  private async createPlayer(session: LoginSession, gender: 'male' | 'female' | 'neutral'): Promise<void> {
    // Hash the password
    const passwordHash = await hashPassword(session.password);

    // Store hashed password in in-memory map (for testing fallback)
    this._passwords.set(session.name.toLowerCase(), passwordHash);

    // Check if this is the first player (will become admin)
    let isFirstPlayer = false;
    if (typeof efuns !== 'undefined' && efuns.listPlayers) {
      const existingPlayers = await efuns.listPlayers();
      isFirstPlayer = existingPlayers.length === 0;
    }

    // Create player object
    const player = new Player();
    player.createAccount(session.name, passwordHash, session.email);
    player.gender = gender;
    player.shortDesc = session.name;

    // Grant admin permissions to the first player
    if (isFirstPlayer) {
      player.permissionLevel = 3; // Administrator
      session.connection.send('\n*** You are the first player - granting Administrator privileges! ***\n');
    }

    // Store hashed password in properties so it gets serialized
    player.setProperty('passwordHash', passwordHash);
    player.setProperty('email', session.email);
    player.setProperty('permissionLevel', player.permissionLevel);

    session.connection.send(`\nWelcome to the game, ${session.name}!\n\n`);

    // Complete login (this will also save the player)
    await this.completeLogin(session, player);
  }

  /**
   * Complete the login process.
   */
  private async completeLogin(session: LoginSession, newPlayer?: Player): Promise<void> {
    let player: Player;

    // Check if player is already in the game world (active but possibly disconnected)
    if (!newPlayer && typeof efuns !== 'undefined' && efuns.findActivePlayer) {
      const existingPlayer = efuns.findActivePlayer(session.name) as Player | undefined;
      if (existingPlayer) {
        // Reconnecting to existing player in game world
        player = existingPlayer;

        // Get new IP and resolve hostname
        const newIp = session.connection.getRemoteAddress();
        const oldAddress = player.getDisplayAddress();
        player.ipAddress = newIp;
        player.resolvedHostname = await resolveHostname(newIp);

        // Check if they're currently connected (session takeover) or disconnected (reconnect)
        const isConnected = efuns.findConnectedPlayer?.(session.name) !== undefined;

        if (isConnected) {
          // Session takeover - transfer connection from old to new
          efuns.transferConnection(session.connection, player);
        } else {
          // Reconnecting after disconnect - just bind the new connection
          player.bindConnection(session.connection);
          efuns.bindPlayerToConnection(session.connection, player);
        }

        // Send reconnect notification to notify channel
        const channelDaemon = getChannelDaemon();
        channelDaemon.sendNotification(
          'notify',
          `{bold}${player.name}{/} reconnected from ${player.getDisplayAddress()} (was: ${oldAddress})`
        );

        // Notify the player
        player.receive('\n{yellow}Reconnecting...{/}\n');
        player.receive('Your previous session has been resumed.\n\n');

        // Look at the room
        const roomWithLook = player.environment as MudObject & { look?: (viewer: MudObject) => void };
        if (roomWithLook && typeof roomWithLook.look === 'function') {
          roomWithLook.look(player);
        }

        // Send prompt
        player.sendPrompt();

        // Update session state and clean up
        session.state = 'playing';
        this._sessions.delete(session.connection);
        return;
      }
    }

    if (newPlayer) {
      // New player just created
      player = newPlayer;
    } else {
      // Existing player - restore from saved data
      player = new Player();

      // Call player.restore() with the full save data
      if (session.savedData) {
        player.restore(session.savedData as PlayerSaveData);
      } else {
        player.name = session.name;
        player.shortDesc = session.name;
      }

      // Restore properties from state (for passwordHash, email, permissionLevel, etc.)
      if (session.savedData?.state?.properties) {
        for (const [key, value] of Object.entries(session.savedData.state.properties)) {
          // Skip legacy plain-text password - we'll upgrade it below
          if (key === 'password') continue;
          player.setProperty(key, value);
        }

        // Restore permission level from properties
        const props = session.savedData.state.properties;
        if (props.permissionLevel !== undefined) player.permissionLevel = props.permissionLevel as number;

        // Upgrade legacy plain-text password to hash
        if (props.password && !props.passwordHash && session.password) {
          const newHash = await hashPassword(session.password);
          player.setProperty('passwordHash', newHash);
          // Update in-memory fallback too
          this._passwords.set(session.name.toLowerCase(), newHash);
        }
      }
    }

    // Bind connection to player (both at player level and driver level)
    player.bindConnection(session.connection);
    if (typeof efuns !== 'undefined') {
      efuns.bindPlayerToConnection(session.connection, player);
      // Register as active player in the game world
      efuns.registerActivePlayer(player);
    }

    // Get IP address and resolve hostname
    const ipAddress = session.connection.getRemoteAddress();
    player.ipAddress = ipAddress;
    player.resolvedHostname = await resolveHostname(ipAddress);

    // Send login notification to notify channel
    const channelDaemon = getChannelDaemon();
    if (newPlayer) {
      channelDaemon.sendNotification(
        'notify',
        `{bold}${player.name}{/} (NEW) logged in from ${player.getDisplayAddress()}`
      );
    } else {
      channelDaemon.sendNotification(
        'notify',
        `{bold}${player.name}{/} logged in from ${player.getDisplayAddress()}`
      );
    }

    // Move to starting room (or last location for returning players)
    let startLocation = '/areas/town/center';
    if (session.savedData?.location) {
      startLocation = session.savedData.location;
    }
    const room = typeof efuns !== 'undefined' ? efuns.findObject(startLocation) : undefined;
    if (room) {
      await player.moveTo(room);
    }

    // Restore inventory items (clone each saved item and move to player)
    if (session.savedData?.inventory && Array.isArray(session.savedData.inventory)) {
      for (const itemPath of session.savedData.inventory) {
        try {
          if (typeof efuns !== 'undefined' && efuns.cloneObject) {
            const item = await efuns.cloneObject(itemPath);
            if (item) {
              await item.moveTo(player);
            }
          }
        } catch (error) {
          console.error(`Error restoring inventory item ${itemPath}:`, error);
        }
      }
    }

    // Restore equipment state (must be done after inventory is loaded)
    const playerWithEquipment = player as Player & { restoreEquipment?: () => void };
    if (playerWithEquipment.restoreEquipment) {
      playerWithEquipment.restoreEquipment();
    }

    // Call onConnect
    await player.onConnect();

    // Look at the room
    const roomWithLook = player.environment as MudObject & { look?: (viewer: MudObject) => void };
    if (roomWithLook && typeof roomWithLook.look === 'function') {
      roomWithLook.look(player);
    }

    // Save the player (update last login time, etc.)
    if (typeof efuns !== 'undefined' && efuns.savePlayer) {
      await efuns.savePlayer(player);
    }

    // Send prompt
    player.sendPrompt();

    // Update session state
    session.state = 'playing';

    // Clean up session - player now handles input directly
    this._sessions.delete(session.connection);
  }

  /**
   * Validate a player name.
   */
  private isValidName(name: string): boolean {
    if (name.length < 3 || name.length > 16) return false;
    if (!/^[a-zA-Z]+$/.test(name)) return false;
    return true;
  }

  /**
   * Handle disconnection during login.
   */
  handleDisconnect(connection: Connection): void {
    this._sessions.delete(connection);
  }
}

export default LoginDaemon;
