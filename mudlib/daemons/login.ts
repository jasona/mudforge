/**
 * Login Daemon - Handles player authentication and character creation.
 *
 * This daemon is invoked by the driver when a new connection is established.
 * It guides the user through login or character creation.
 */

import { MudObject } from '../std/object.js';
import { Player } from '../std/player.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  findObject(pathOrId: string): MudObject | undefined;
  cloneObject(path: string): Promise<MudObject | undefined>;
  send(target: MudObject, message: string): void;
  time(): number;
  bindPlayerToConnection(connection: Connection, player: MudObject): void;
};

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
}

/**
 * Login Daemon class.
 */
export class LoginDaemon extends MudObject {
  private _sessions: Map<Connection, LoginSession> = new Map();
  private _players: Map<string, Player> = new Map(); // In-memory player store (would be file-based)
  private _passwords: Map<string, string> = new Map(); // Player passwords (would be hashed and stored)

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

    // Check if player exists
    if (this._passwords.has(session.name.toLowerCase())) {
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
      // Existing player - verify password
      const storedPassword = this._passwords.get(session.name.toLowerCase());
      if (password !== storedPassword) {
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
    // Store password
    this._passwords.set(session.name.toLowerCase(), session.password);

    // Create player object
    const player = new Player();
    player.createAccount(session.name, session.password, session.email);
    player.gender = gender;
    player.shortDesc = session.name;

    // Store player
    this._players.set(session.name.toLowerCase(), player);

    session.connection.send(`\nWelcome to the game, ${session.name}!\n\n`);

    // Complete login
    await this.completeLogin(session, player);
  }

  /**
   * Complete the login process.
   */
  private async completeLogin(session: LoginSession, existingPlayer?: Player): Promise<void> {
    let player: Player;

    if (existingPlayer) {
      player = existingPlayer;
    } else {
      // Load existing player
      player = this._players.get(session.name.toLowerCase()) || new Player();
      player.name = session.name;
    }

    // Bind connection to player (both at player level and driver level)
    player.bindConnection(session.connection);
    if (typeof efuns !== 'undefined') {
      efuns.bindPlayerToConnection(session.connection, player);
    }

    // Move to starting room
    const voidRoom =
      typeof efuns !== 'undefined' ? efuns.findObject('/areas/void/void') : undefined;
    if (voidRoom) {
      await player.moveTo(voidRoom);
    }

    // Call onConnect
    await player.onConnect();

    // Look at the room
    const room = player.environment as MudObject & { look?: (viewer: MudObject) => void };
    if (room && typeof room.look === 'function') {
      room.look(player);
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
