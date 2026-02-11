/**
 * ReconnectOverlay - Fullscreen overlay for connection loss/reconnection state.
 *
 * Replaces terminal spam with a centered card showing connection status,
 * countdown timer, attempt count, and manual reconnect button.
 */

export class ReconnectOverlay {
  private overlay: HTMLDivElement;
  private spinnerEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private detailEl: HTMLDivElement;
  private countdownEl: HTMLDivElement;
  private btnEl: HTMLButtonElement;
  private countdownTimer: number | null = null;
  private countdownSeconds: number = 0;
  private _visible: boolean = false;
  private onReconnectNow: () => void;

  constructor(onReconnectNow: () => void) {
    this.onReconnectNow = onReconnectNow;

    // Build DOM structure once
    this.overlay = document.createElement('div');
    this.overlay.className = 'reconnect-overlay';
    this.overlay.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'reconnect-card';

    this.spinnerEl = document.createElement('div');
    this.spinnerEl.className = 'reconnect-spinner';

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'reconnect-status';

    this.detailEl = document.createElement('div');
    this.detailEl.className = 'reconnect-detail';

    this.countdownEl = document.createElement('div');
    this.countdownEl.className = 'reconnect-countdown';

    this.btnEl = document.createElement('button');
    this.btnEl.className = 'reconnect-btn';
    this.btnEl.textContent = 'Reconnect Now';
    this.btnEl.addEventListener('click', () => this.handleButtonClick());

    card.appendChild(this.spinnerEl);
    card.appendChild(this.statusEl);
    card.appendChild(this.detailEl);
    card.appendChild(this.countdownEl);
    card.appendChild(this.btnEl);
    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);
  }

  get visible(): boolean {
    return this._visible;
  }

  /**
   * Show initial disconnect state — static red spinner, reason text.
   */
  showDisconnected(reason: string): void {
    this.stopCountdown();
    this.show();
    this.overlay.classList.remove('reconnect-connecting', 'reconnect-expired');
    this.overlay.classList.add('reconnect-disconnected');
    this.spinnerEl.style.display = '';
    this.statusEl.textContent = 'Disconnected';
    this.detailEl.textContent = reason;
    this.countdownEl.textContent = '';
    this.btnEl.textContent = 'Reconnect Now';
    this.btnEl.style.display = '';
  }

  /**
   * Show reconnecting state — animated spinner, attempt count, countdown.
   */
  showReconnecting(attempt: number, maxLabel: string, delayMs: number): void {
    this.show();
    this.overlay.classList.remove('reconnect-disconnected', 'reconnect-expired', 'reconnect-connecting');
    this.spinnerEl.style.display = '';
    this.statusEl.textContent = 'Reconnecting...';
    this.detailEl.textContent = `Attempt ${attempt}${maxLabel !== '∞' ? ` / ${maxLabel}` : ''}`;
    this.btnEl.textContent = 'Reconnect Now';
    this.btnEl.style.display = '';
    this.startCountdown(Math.ceil(delayMs / 1000));
  }

  /**
   * Show active connection attempt — animated spinner, no countdown.
   */
  showConnecting(): void {
    this.stopCountdown();
    this.show();
    this.overlay.classList.remove('reconnect-disconnected', 'reconnect-expired');
    this.overlay.classList.add('reconnect-connecting');
    this.spinnerEl.style.display = '';
    this.statusEl.textContent = 'Connecting...';
    this.detailEl.textContent = '';
    this.countdownEl.textContent = '';
    this.btnEl.style.display = 'none';
  }

  /**
   * Show session expired state — no spinner, reload button.
   */
  showSessionExpired(): void {
    this.stopCountdown();
    this.show();
    this.overlay.classList.remove('reconnect-disconnected', 'reconnect-connecting');
    this.overlay.classList.add('reconnect-expired');
    this.spinnerEl.style.display = 'none';
    this.statusEl.textContent = 'Session Expired';
    this.detailEl.textContent = 'Please log in again.';
    this.countdownEl.textContent = '';
    this.btnEl.textContent = 'Return to Login';
    this.btnEl.classList.add('primary');
    this.btnEl.style.display = '';
  }

  /**
   * Dismiss overlay with fade-out animation.
   */
  hide(): void {
    if (!this._visible) return;
    this.stopCountdown();
    this.overlay.classList.add('hiding');
    // Remove after animation completes
    const onEnd = () => {
      this.overlay.removeEventListener('animationend', onEnd);
      this.overlay.style.display = 'none';
      this.overlay.classList.remove('hiding', 'reconnect-disconnected', 'reconnect-expired', 'reconnect-connecting');
      this.btnEl.classList.remove('primary');
      this._visible = false;
    };
    this.overlay.addEventListener('animationend', onEnd);
    // Fallback in case animationend doesn't fire
    setTimeout(onEnd, 400);
  }

  private show(): void {
    this.overlay.classList.remove('hiding');
    this.overlay.style.display = 'flex';
    this._visible = true;
  }

  private handleButtonClick(): void {
    if (this.overlay.classList.contains('reconnect-expired')) {
      window.location.reload();
    } else {
      this.onReconnectNow();
    }
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.countdownSeconds = seconds;
    this.updateCountdownDisplay();
    this.countdownTimer = window.setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        this.countdownEl.textContent = 'Connecting...';
      } else {
        this.updateCountdownDisplay();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private updateCountdownDisplay(): void {
    this.countdownEl.textContent = `Retrying in ${this.countdownSeconds}s...`;
  }
}
