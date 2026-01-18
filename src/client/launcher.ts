/**
 * Launcher - Handles the graphical login interface.
 *
 * Manages the launcher UI, login form, registration modal,
 * and transitions to the game terminal after successful authentication.
 */

import type { WebSocketClient, AuthResponseMessage } from './websocket-client.js';

/**
 * Launcher class handles the pre-game login interface.
 */
export class Launcher {
  private wsClient: WebSocketClient;
  private onLoginSuccess: () => void;
  private isConnected: boolean = false;

  // DOM Elements
  private launcher: HTMLElement | null = null;
  private app: HTMLElement | null = null;
  private loginBtn: HTMLButtonElement | null = null;
  private usernameInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private loginError: HTMLElement | null = null;

  // Registration modal elements
  private registerModal: HTMLElement | null = null;
  private regName: HTMLInputElement | null = null;
  private regPassword: HTMLInputElement | null = null;
  private regConfirm: HTMLInputElement | null = null;
  private regEmail: HTMLInputElement | null = null;
  private regGender: HTMLSelectElement | null = null;
  private regSubmit: HTMLButtonElement | null = null;
  private regCancel: HTMLButtonElement | null = null;
  private regError: HTMLElement | null = null;

  constructor(wsClient: WebSocketClient, onLoginSuccess: () => void) {
    this.wsClient = wsClient;
    this.onLoginSuccess = onLoginSuccess;
    this.cacheElements();
    this.setupEventListeners();
  }

  /**
   * Cache DOM elements for faster access.
   */
  private cacheElements(): void {
    this.launcher = document.getElementById('launcher');
    this.app = document.getElementById('app');
    this.loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
    this.usernameInput = document.getElementById('login-username') as HTMLInputElement;
    this.passwordInput = document.getElementById('login-password') as HTMLInputElement;
    this.loginError = document.getElementById('login-error');

    // Registration modal elements
    this.registerModal = document.getElementById('register-modal');
    this.regName = document.getElementById('reg-name') as HTMLInputElement;
    this.regPassword = document.getElementById('reg-password') as HTMLInputElement;
    this.regConfirm = document.getElementById('reg-confirm') as HTMLInputElement;
    this.regEmail = document.getElementById('reg-email') as HTMLInputElement;
    this.regGender = document.getElementById('reg-gender') as HTMLSelectElement;
    this.regSubmit = document.getElementById('reg-submit') as HTMLButtonElement;
    this.regCancel = document.getElementById('reg-cancel') as HTMLButtonElement;
    this.regError = document.getElementById('reg-error');
  }

  /**
   * Set up event listeners.
   */
  private setupEventListeners(): void {
    // Login button click
    this.loginBtn?.addEventListener('click', () => this.handleLogin());

    // Enter key in login form
    this.usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.passwordInput?.focus();
      }
    });

    this.passwordInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });

    // Registration form
    this.regSubmit?.addEventListener('click', () => this.handleRegister());
    this.regCancel?.addEventListener('click', () => this.hideRegistration());

    // Enter key in registration form
    this.regConfirm?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.regEmail?.focus();
      }
    });

    this.regEmail?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.regGender?.focus();
      }
    });

    // Registration modal backdrop click to close
    this.registerModal?.querySelector('.register-backdrop')?.addEventListener('click', () => {
      this.hideRegistration();
    });

    // WebSocket events
    this.wsClient.on('connected', () => {
      this.isConnected = true;
      this.clearError();
    });

    this.wsClient.on('disconnected', () => {
      this.isConnected = false;
      this.showError('Disconnected from server');
    });

    this.wsClient.on('error', (error: unknown) => {
      this.showError(error as string);
    });

    // Auth response handler
    this.wsClient.on('auth-response', (response: unknown) => {
      this.handleAuthResponse(response as AuthResponseMessage);
    });
  }

  /**
   * Handle login button click.
   */
  private handleLogin(): void {
    const username = this.usernameInput?.value.trim();
    const password = this.passwordInput?.value;

    // Validate inputs
    if (!username) {
      this.showError('Please enter your character name');
      this.usernameInput?.focus();
      return;
    }

    if (!password) {
      this.showError('Please enter your password');
      this.passwordInput?.focus();
      return;
    }

    // Check connection
    if (!this.isConnected) {
      this.showError('Not connected to server');
      return;
    }

    // Clear previous error
    this.clearError();

    // Disable button while processing
    this.setLoginLoading(true);

    // Send login request
    this.wsClient.sendAuthRequest({
      type: 'login',
      name: username,
      password: password,
    });
  }

  /**
   * Handle registration form submit.
   */
  private handleRegister(): void {
    const name = this.regName?.value.trim();
    const password = this.regPassword?.value;
    const confirm = this.regConfirm?.value;
    const email = this.regEmail?.value.trim();
    const gender = this.regGender?.value;

    // Validate inputs
    if (!name) {
      this.showRegError('Please enter a character name');
      this.regName?.focus();
      return;
    }

    if (!password) {
      this.showRegError('Please enter a password');
      this.regPassword?.focus();
      return;
    }

    if (password.length < 6) {
      this.showRegError('Password must be at least 6 characters');
      this.regPassword?.focus();
      return;
    }

    if (password !== confirm) {
      this.showRegError('Passwords do not match');
      this.regConfirm?.focus();
      return;
    }

    if (!gender) {
      this.showRegError('Please select a gender');
      this.regGender?.focus();
      return;
    }

    // Check connection
    if (!this.isConnected) {
      this.showRegError('Not connected to server');
      return;
    }

    // Clear previous error
    this.clearRegError();

    // Disable button while processing
    this.setRegisterLoading(true);

    // Send registration request
    this.wsClient.sendAuthRequest({
      type: 'register',
      name: name,
      password: password,
      confirmPassword: confirm,
      email: email || undefined,
      gender: gender,
    });
  }

  /**
   * Handle authentication response from server.
   */
  private handleAuthResponse(response: AuthResponseMessage): void {
    // Re-enable buttons
    this.setLoginLoading(false);
    this.setRegisterLoading(false);

    if (response.success) {
      // Login/registration successful - transition to game
      this.transitionToGame();
    } else if (response.requiresRegistration) {
      // User doesn't exist - show registration modal
      this.showRegistration();
    } else {
      // Show error message
      const errorMessage = response.error || 'Authentication failed';

      // Show in appropriate location (login or register)
      if (this.registerModal?.classList.contains('hidden')) {
        this.showError(errorMessage);
      } else {
        this.showRegError(errorMessage);
      }
    }
  }

  /**
   * Show the registration modal.
   */
  private showRegistration(): void {
    // Pre-fill the name from login form
    const username = this.usernameInput?.value.trim();
    if (username && this.regName) {
      this.regName.value = username;
    }

    // Clear the password from login form (for security)
    if (this.passwordInput) {
      this.passwordInput.value = '';
    }

    // Clear registration form (except name)
    if (this.regPassword) this.regPassword.value = '';
    if (this.regConfirm) this.regConfirm.value = '';
    if (this.regEmail) this.regEmail.value = '';
    if (this.regGender) this.regGender.value = '';
    this.clearRegError();

    // Show modal
    this.registerModal?.classList.remove('hidden');

    // Focus password field since name is pre-filled
    setTimeout(() => this.regPassword?.focus(), 100);
  }

  /**
   * Hide the registration modal.
   */
  private hideRegistration(): void {
    this.registerModal?.classList.add('hidden');
    this.clearRegError();

    // Focus username field
    this.usernameInput?.focus();
  }

  /**
   * Transition from launcher to game terminal.
   */
  private transitionToGame(): void {
    // Hide registration modal if open
    this.registerModal?.classList.add('hidden');

    // Hide launcher with fade out
    if (this.launcher) {
      this.launcher.classList.add('fade-out');

      // After animation, hide launcher and show app
      setTimeout(() => {
        this.launcher?.classList.add('hidden');
        this.app?.classList.remove('hidden');
        this.onLoginSuccess();
      }, 300);
    } else {
      // Fallback if no launcher element
      this.app?.classList.remove('hidden');
      this.onLoginSuccess();
    }
  }

  /**
   * Show login error message.
   */
  private showError(message: string): void {
    if (this.loginError) {
      this.loginError.textContent = message;
      this.loginError.classList.add('visible');
    }
  }

  /**
   * Clear login error message.
   */
  private clearError(): void {
    if (this.loginError) {
      this.loginError.textContent = '';
      this.loginError.classList.remove('visible');
    }
  }

  /**
   * Show registration error message.
   */
  private showRegError(message: string): void {
    if (this.regError) {
      this.regError.textContent = message;
      this.regError.classList.add('visible');
    }
  }

  /**
   * Clear registration error message.
   */
  private clearRegError(): void {
    if (this.regError) {
      this.regError.textContent = '';
      this.regError.classList.remove('visible');
    }
  }

  /**
   * Set login button loading state.
   */
  private setLoginLoading(loading: boolean): void {
    if (this.loginBtn) {
      this.loginBtn.disabled = loading;
      if (loading) {
        this.loginBtn.classList.add('loading');
      } else {
        this.loginBtn.classList.remove('loading');
      }
    }
  }

  /**
   * Set register button loading state.
   */
  private setRegisterLoading(loading: boolean): void {
    if (this.regSubmit) {
      this.regSubmit.disabled = loading;
      if (loading) {
        this.regSubmit.classList.add('loading');
      } else {
        this.regSubmit.classList.remove('loading');
      }
    }
  }
}

export default Launcher;
