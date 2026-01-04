/**
 * Integration test: Full player flow
 *
 * Tests the complete player journey:
 * connect → login (new player) → move between rooms → quit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { LoginDaemon } from '../../mudlib/daemons/login.js';
import { Player } from '../../mudlib/std/player.js';
import { Room } from '../../mudlib/std/room.js';
import {
  ConnectionManager,
  resetConnectionManager,
} from '../../src/network/connection-manager.js';
import { Connection } from '../../src/network/connection.js';

/**
 * Mock WebSocket for testing.
 */
class MockWebSocket extends EventEmitter {
  readyState = 1; // WebSocket.OPEN
  OPEN = 1;
  sentMessages: string[] = [];

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3; // CLOSED
    this.emit('close', code || 1000, Buffer.from(reason || ''));
  }

  terminate(): void {
    this.readyState = 3;
    this.emit('close', 1006, Buffer.from(''));
  }

  // Helper to simulate receiving a message from client
  simulateMessage(message: string): void {
    this.emit('message', Buffer.from(message + '\n'));
  }
}

/**
 * Mock connection that tracks sent messages.
 */
class MockConnection {
  messages: string[] = [];
  closed = false;

  send(message: string): void {
    this.messages.push(message);
  }

  close(): void {
    this.closed = true;
  }

  isConnected(): boolean {
    return !this.closed;
  }

  getRemoteAddress(): string {
    return '127.0.0.1';
  }

  getLastMessage(): string {
    return this.messages[this.messages.length - 1] || '';
  }

  getAllMessages(): string {
    return this.messages.join('');
  }

  clearMessages(): void {
    this.messages = [];
  }
}

describe('Player Flow Integration', () => {
  let loginDaemon: LoginDaemon;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    resetConnectionManager();
    connectionManager = new ConnectionManager();
    loginDaemon = new LoginDaemon();
  });

  afterEach(() => {
    resetConnectionManager();
  });

  describe('New Player Registration', () => {
    it('should complete full new player registration flow', async () => {
      const mockConn = new MockConnection();

      // Start login session
      loginDaemon.startSession(mockConn);

      // Should receive welcome banner and name prompt
      const welcomeOutput = mockConn.getAllMessages();
      expect(welcomeOutput).toContain('Welcome to MudForge');
      expect(welcomeOutput).toContain('By what name do you wish to be known?');

      mockConn.clearMessages();

      // Enter name (new player)
      await loginDaemon.processInput(mockConn, 'TestHero');

      // Should indicate new player and ask for password
      const nameResponse = mockConn.getAllMessages();
      expect(nameResponse).toContain('Testhero is a new character');
      expect(nameResponse).toContain('Please choose a password');

      mockConn.clearMessages();

      // Enter password
      await loginDaemon.processInput(mockConn, 'password123');

      // Should ask for confirmation
      expect(mockConn.getAllMessages()).toContain('Please confirm your password');

      mockConn.clearMessages();

      // Confirm password
      await loginDaemon.processInput(mockConn, 'password123');

      // Should ask for email
      expect(mockConn.getAllMessages()).toContain('email address');

      mockConn.clearMessages();

      // Enter email
      await loginDaemon.processInput(mockConn, 'test@example.com');

      // Should ask for gender
      const genderPrompt = mockConn.getAllMessages();
      expect(genderPrompt).toContain('gender');
      expect(genderPrompt).toContain('Male');
      expect(genderPrompt).toContain('Female');
      expect(genderPrompt).toContain('Neutral');

      mockConn.clearMessages();

      // Select gender
      await loginDaemon.processInput(mockConn, '1');

      // Should complete registration
      const welcomeMsg = mockConn.getAllMessages();
      expect(welcomeMsg).toContain('Welcome');
      expect(welcomeMsg).toContain('Testhero');
    });

    it('should reject invalid names', async () => {
      const mockConn = new MockConnection();

      loginDaemon.startSession(mockConn);
      mockConn.clearMessages();

      // Try name that's too short
      await loginDaemon.processInput(mockConn, 'ab');
      expect(mockConn.getAllMessages()).toContain('Invalid name');

      mockConn.clearMessages();

      // Try name with numbers
      await loginDaemon.processInput(mockConn, 'test123');
      expect(mockConn.getAllMessages()).toContain('Invalid name');
    });

    it('should reject weak passwords', async () => {
      const mockConn = new MockConnection();

      loginDaemon.startSession(mockConn);
      await loginDaemon.processInput(mockConn, 'ValidName');
      mockConn.clearMessages();

      // Try password that's too short
      await loginDaemon.processInput(mockConn, '12345');
      expect(mockConn.getAllMessages()).toContain('at least 6 characters');
    });

    it('should reject mismatched password confirmation', async () => {
      const mockConn = new MockConnection();

      loginDaemon.startSession(mockConn);
      await loginDaemon.processInput(mockConn, 'ValidName');
      await loginDaemon.processInput(mockConn, 'password123');
      mockConn.clearMessages();

      // Enter wrong confirmation
      await loginDaemon.processInput(mockConn, 'differentpassword');
      expect(mockConn.getAllMessages()).toContain('Passwords do not match');
    });
  });

  describe('Returning Player Login', () => {
    it('should authenticate returning player with correct password', async () => {
      const mockConn = new MockConnection();

      // First, create a new player
      loginDaemon.startSession(mockConn);
      await loginDaemon.processInput(mockConn, 'ReturningUser');
      await loginDaemon.processInput(mockConn, 'mypassword');
      await loginDaemon.processInput(mockConn, 'mypassword');
      await loginDaemon.processInput(mockConn, 'test@test.com');
      await loginDaemon.processInput(mockConn, '2'); // female

      // Now login as returning player
      const mockConn2 = new MockConnection();
      loginDaemon.startSession(mockConn2);
      mockConn2.clearMessages();

      await loginDaemon.processInput(mockConn2, 'ReturningUser');

      // Should recognize existing player
      const response = mockConn2.getAllMessages();
      expect(response).toContain('Welcome back');
      expect(response).toContain('Password');

      mockConn2.clearMessages();

      // Enter correct password
      await loginDaemon.processInput(mockConn2, 'mypassword');

      // Should log in successfully
      expect(mockConn2.getAllMessages()).toContain('Welcome');
    });

    it('should reject wrong password', async () => {
      const mockConn = new MockConnection();

      // Create player first
      loginDaemon.startSession(mockConn);
      await loginDaemon.processInput(mockConn, 'SecureUser');
      await loginDaemon.processInput(mockConn, 'correctpassword');
      await loginDaemon.processInput(mockConn, 'correctpassword');
      await loginDaemon.processInput(mockConn, 'test@test.com');
      await loginDaemon.processInput(mockConn, '1');

      // Try to login with wrong password
      const mockConn2 = new MockConnection();
      loginDaemon.startSession(mockConn2);
      await loginDaemon.processInput(mockConn2, 'SecureUser');
      mockConn2.clearMessages();

      await loginDaemon.processInput(mockConn2, 'wrongpassword');

      expect(mockConn2.getAllMessages()).toContain('Incorrect password');
    });
  });

  describe('Player Movement', () => {
    let player: Player;
    let startRoom: Room;
    let northRoom: Room;
    let mockConn: MockConnection;

    beforeEach(() => {
      mockConn = new MockConnection();
      player = new Player();
      player.name = 'TestPlayer';
      player.bindConnection(mockConn);

      // Create rooms
      startRoom = new Room();
      startRoom.shortDesc = 'Starting Room';
      startRoom.longDesc = 'You are in the starting room.';

      northRoom = new Room();
      northRoom.shortDesc = 'North Room';
      northRoom.longDesc = 'You are in the north room.';

      // Connect rooms - passing actual room objects (not paths)
      startRoom.addExit('north', northRoom);
      northRoom.addExit('south', startRoom);

      // Place player in start room
      player.moveTo(startRoom);
    });

    it('should move player between rooms', async () => {
      expect(player.environment).toBe(startRoom);
      expect(startRoom.inventory).toContain(player);

      // Move north
      const moved = await player.moveDirection('north');

      expect(moved).toBe(true);
      expect(player.environment).toBe(northRoom);
      expect(northRoom.inventory).toContain(player);
      expect(startRoom.inventory).not.toContain(player);
    });

    it('should reject movement in invalid directions', async () => {
      mockConn.clearMessages();

      const moved = await player.moveDirection('east');

      expect(moved).toBe(false);
      expect(player.environment).toBe(startRoom);
      expect(mockConn.getAllMessages()).toContain("can't go that way");
    });

    it('should broadcast departure and arrival messages', async () => {
      // Add another player to observe
      const observer = new Player();
      const observerConn = new MockConnection();
      observer.name = 'Observer';
      observer.bindConnection(observerConn);
      await observer.moveTo(startRoom);

      observerConn.clearMessages();

      // Move the test player
      await player.moveDirection('north');

      // Observer should see departure message
      expect(observerConn.getAllMessages()).toContain('leaves north');
    });

    it('should show room description after movement', async () => {
      mockConn.clearMessages();

      await player.moveDirection('north');

      const output = mockConn.getAllMessages();
      expect(output).toContain('North Room');
    });
  });

  describe('Player Commands', () => {
    let player: Player;
    let room: Room;
    let mockConn: MockConnection;

    beforeEach(() => {
      mockConn = new MockConnection();
      player = new Player();
      player.name = 'Commander';
      player.bindConnection(mockConn);

      room = new Room();
      room.shortDesc = 'Test Room';
      room.longDesc = 'A room for testing commands.';

      player.moveTo(room);
    });

    it('should process commands and return handled status', async () => {
      // Add a test action
      player.addAction('test', async () => {
        player.receive('Test command executed!');
        return true;
      });

      mockConn.clearMessages();

      const handled = await player.command('test');

      expect(handled).toBe(true);
      expect(mockConn.getAllMessages()).toContain('Test command executed');
    });

    it('should return false for unknown commands', async () => {
      const handled = await player.command('unknowncommand');
      expect(handled).toBe(false);
    });

    it('should support say command via Living class', () => {
      mockConn.clearMessages();

      player.say('Hello, world!');

      expect(mockConn.getAllMessages()).toContain('You say: Hello, world!');
    });

    it('should support emote command', () => {
      mockConn.clearMessages();

      player.emote('waves hello.');

      expect(mockConn.getAllMessages()).toContain('Commander waves hello.');
    });
  });

  describe('Player Quit', () => {
    it('should disconnect player on quit', async () => {
      const mockConn = new MockConnection();
      const player = new Player();
      player.name = 'QuittingPlayer';
      player.bindConnection(mockConn);

      const room = new Room();
      await player.moveTo(room);

      expect(room.inventory).toContain(player);

      mockConn.clearMessages();
      await player.quit();

      expect(mockConn.getAllMessages()).toContain('Goodbye');
      expect(mockConn.closed).toBe(true);
      expect(player.isConnected()).toBe(false);
      expect(room.inventory).not.toContain(player);
    });
  });

  describe('Full Flow: Connect → Login → Move → Quit', () => {
    it('should complete entire player session', async () => {
      const mockConn = new MockConnection();

      // 1. Connect and register
      loginDaemon.startSession(mockConn);
      await loginDaemon.processInput(mockConn, 'FullFlowPlayer');
      await loginDaemon.processInput(mockConn, 'securepass');
      await loginDaemon.processInput(mockConn, 'securepass');
      await loginDaemon.processInput(mockConn, 'flow@test.com');
      await loginDaemon.processInput(mockConn, '3'); // neutral gender

      // 2. Player should be created and logged in
      const output = mockConn.getAllMessages();
      expect(output).toContain('Welcome');

      // 3. Create a player and room for movement testing
      const player = new Player();
      const playerConn = new MockConnection();
      player.name = 'FullFlowPlayer';
      player.bindConnection(playerConn);

      const startRoom = new Room();
      startRoom.shortDesc = 'The Void';
      startRoom.longDesc = 'An empty void stretches in all directions.';

      const exitRoom = new Room();
      exitRoom.shortDesc = 'Exit Chamber';

      startRoom.addExit('enter', exitRoom);
      exitRoom.addExit('leave', startRoom);

      await player.moveTo(startRoom);
      playerConn.clearMessages();

      // 4. Move to another room
      const moved = await player.moveDirection('enter');
      expect(moved).toBe(true);
      expect(player.environment).toBe(exitRoom);

      // 5. Quit
      playerConn.clearMessages();
      await player.quit();

      expect(playerConn.getAllMessages()).toContain('Goodbye');
      expect(playerConn.closed).toBe(true);
    });
  });

  describe('Connection Manager Integration', () => {
    it('should track connections through lifecycle', () => {
      const socket = new MockWebSocket() as unknown as import('ws').WebSocket;
      const connection = new Connection(socket, 'test-conn-1', '127.0.0.1');

      connectionManager.add(connection);
      expect(connectionManager.count).toBe(1);
      expect(connectionManager.get('test-conn-1')).toBe(connection);

      // Bind a player
      const player = { name: 'TestPlayer' };
      connection.bindPlayer(player);
      expect(connectionManager.playerCount).toBe(1);

      // Remove connection
      connectionManager.remove('test-conn-1');
      expect(connectionManager.count).toBe(0);
    });
  });

  describe('Session Error Handling', () => {
    it('should handle disconnection during login', () => {
      const mockConn = new MockConnection();

      loginDaemon.startSession(mockConn);
      loginDaemon.handleDisconnect(mockConn);

      // Should be able to start a new session
      const mockConn2 = new MockConnection();
      loginDaemon.startSession(mockConn2);

      expect(mockConn2.getAllMessages()).toContain('Welcome to MudForge');
    });

    it('should reject input on closed session', async () => {
      const mockConn = new MockConnection();

      // Don't start a session, just try to process input
      await loginDaemon.processInput(mockConn, 'test');

      expect(mockConn.getAllMessages()).toContain('Session error');
      expect(mockConn.closed).toBe(true);
    });
  });
});
