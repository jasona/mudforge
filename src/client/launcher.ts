/**
 * Launcher - Handles the graphical login interface.
 *
 * Manages the launcher UI, login form, registration modal,
 * and transitions to the game terminal after successful authentication.
 */

import type { WebSocketClient, AuthResponseMessage } from './websocket-client.js';
import { getAvatarSvg, getAvatarList } from './avatars.js';

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
  private regAvatarPicker: HTMLElement | null = null;
  private regAvatar: HTMLInputElement | null = null;
  private regSubmit: HTMLButtonElement | null = null;
  private regCancel: HTMLButtonElement | null = null;
  private regError: HTMLElement | null = null;

  constructor(wsClient: WebSocketClient, onLoginSuccess: () => void) {
    this.wsClient = wsClient;
    this.onLoginSuccess = onLoginSuccess;
    this.cacheElements();
    this.setupEventListeners();
    this.fetchGameConfig();
  }

  /**
   * Fetch game configuration from the server and update UI.
   */
  private async fetchGameConfig(): Promise<void> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        console.warn('Failed to fetch game config');
        return;
      }

      const config = await response.json();

      // Update launcher title
      const titleEl = document.querySelector('.launcher-title');
      if (titleEl && config.game?.name) {
        titleEl.textContent = config.game.name;
      }

      // Update tagline
      const taglineEl = document.querySelector('.launcher-tagline');
      if (taglineEl && config.game?.tagline) {
        taglineEl.textContent = config.game.tagline;
      }

      // Update page title
      if (config.game?.name) {
        document.title = config.game.name;
      }

      // Update in-game header
      const headerTitle = document.querySelector('#header h1');
      if (headerTitle && config.game?.name) {
        headerTitle.textContent = config.game.name;
      }

      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && config.game?.name && config.game?.description) {
        metaDesc.setAttribute('content', `${config.game.name} - ${config.game.description}`);
      }
    } catch (error) {
      console.warn('Failed to fetch game config:', error);
    }
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
    this.regAvatarPicker = document.getElementById('reg-avatar-picker');
    this.regAvatar = document.getElementById('reg-avatar') as HTMLInputElement;
    this.regSubmit = document.getElementById('reg-submit') as HTMLButtonElement;
    this.regCancel = document.getElementById('reg-cancel') as HTMLButtonElement;
    this.regError = document.getElementById('reg-error');

    // Populate avatar picker
    this.populateAvatarPicker();
  }

  /**
   * Populate the avatar picker with all available avatars.
   */
  private populateAvatarPicker(): void {
    if (!this.regAvatarPicker) return;

    const avatarList = getAvatarList();
    let currentCategory = '';

    for (const avatar of avatarList) {
      // Add category header if changed
      if (avatar.category !== currentCategory) {
        currentCategory = avatar.category;
        const categoryLabel = document.createElement('div');
        categoryLabel.className = 'avatar-picker-category';
        categoryLabel.textContent =
          currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
        this.regAvatarPicker.appendChild(categoryLabel);
      }

      // Create avatar item
      const item = document.createElement('div');
      item.className = 'avatar-picker-item';
      item.dataset.avatarId = avatar.id;
      item.innerHTML = getAvatarSvg(avatar.id);
      item.title = `${avatar.category} - ${avatar.label}`;

      // Click handler
      item.addEventListener('click', () => this.selectAvatar(avatar.id));

      this.regAvatarPicker.appendChild(item);
    }
  }

  /**
   * Select an avatar in the picker.
   */
  private selectAvatar(avatarId: string): void {
    if (!this.regAvatarPicker || !this.regAvatar) return;

    // Update hidden input
    this.regAvatar.value = avatarId;

    // Update visual selection
    const items = this.regAvatarPicker.querySelectorAll('.avatar-picker-item');
    items.forEach((item) => {
      if ((item as HTMLElement).dataset.avatarId === avatarId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
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
    const avatar = this.regAvatar?.value;

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
      avatar: avatar || undefined,
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
    if (this.regAvatar) this.regAvatar.value = '';
    this.clearRegError();

    // Clear avatar selection
    this.regAvatarPicker
      ?.querySelectorAll('.avatar-picker-item')
      .forEach((item) => item.classList.remove('selected'));

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
