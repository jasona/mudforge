/**
 * Setup Wizard - First-run configuration wizard.
 *
 * Walks the game owner through configuring their game identity,
 * logo, and game mechanics before creating their admin account.
 */

/** Setting metadata from the server */
interface SettingMeta {
  value: unknown;
  description: string;
  type: string;
  min?: number;
  max?: number;
  category: string;
}

const TOTAL_STEPS = 5;

export class SetupWizard {
  private container: HTMLElement;
  private onComplete: () => void;
  private currentStep = 0;
  private settingsData: Record<string, SettingMeta> = {};
  private logoDataUrl: string | null = null;
  private cachedValues: Record<string, string> = {};

  // DOM references
  private card!: HTMLElement;
  private stepIndicator!: HTMLElement;
  private body!: HTMLElement;
  private backBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private errorEl!: HTMLElement;

  constructor(container: HTMLElement, onComplete: () => void) {
    this.container = container;
    this.onComplete = onComplete;
  }

  show(): void {
    this.container.className = 'setup-wizard';
    this.container.innerHTML = '';
    this.buildDOM();
    this.fetchDefaults();
    this.goToStep(0);
  }

  hide(): void {
    this.container.className = 'hidden';
    this.container.innerHTML = '';
  }

  private buildDOM(): void {
    const bg = document.createElement('div');
    bg.className = 'launcher-background';
    this.container.appendChild(bg);

    this.card = document.createElement('div');
    this.card.className = 'setup-wizard-card';

    // Step indicator
    this.stepIndicator = document.createElement('div');
    this.stepIndicator.className = 'setup-step-indicator';
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const dot = document.createElement('div');
      dot.className = 'setup-step-dot';
      dot.dataset.step = String(i);
      this.stepIndicator.appendChild(dot);
    }
    this.card.appendChild(this.stepIndicator);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'setup-wizard-body';

    this.errorEl = document.createElement('div');
    this.errorEl.className = 'setup-error';
    this.body.appendChild(this.errorEl);

    this.card.appendChild(this.body);

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'setup-nav';

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'setup-nav-btn secondary';
    this.backBtn.textContent = 'Back';
    this.backBtn.addEventListener('click', () => this.goToStep(this.currentStep - 1));

    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'setup-nav-btn primary';
    this.nextBtn.textContent = 'Next';
    this.nextBtn.addEventListener('click', () => this.handleNext());

    nav.appendChild(this.backBtn);
    nav.appendChild(this.nextBtn);
    this.card.appendChild(nav);

    this.container.appendChild(this.card);
  }

  private async fetchDefaults(): Promise<void> {
    try {
      const resp = await fetch('/api/setup/defaults');
      if (resp.ok) {
        const data = await resp.json();
        this.settingsData = data.settings || {};
        if (this.currentStep === 3) {
          this.renderCurrentStep();
        }
      }
    } catch {
      // Will use empty settings
    }
  }

  private goToStep(step: number): void {
    if (step < 0 || step >= TOTAL_STEPS) return;
    this.cacheCurrentValues();
    this.currentStep = step;
    this.clearError();
    this.renderCurrentStep();
    this.restoreCachedValues();
    this.updateIndicator();
    this.updateNav();
    this.body.scrollTop = 0;
  }

  private updateIndicator(): void {
    const dots = this.stepIndicator.querySelectorAll('.setup-step-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentStep);
      dot.classList.toggle('completed', i < this.currentStep);
    });
  }

  private updateNav(): void {
    this.backBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';

    if (this.currentStep === 0) {
      this.nextBtn.textContent = 'Get Started';
    } else if (this.currentStep === TOTAL_STEPS - 1) {
      this.nextBtn.textContent = 'Create Admin Account';
    } else {
      this.nextBtn.textContent = 'Next';
    }

    this.nextBtn.classList.remove('loading');
    this.nextBtn.disabled = false;
  }

  private handleNext(): void {
    this.cacheCurrentValues();
    if (this.currentStep === 1 && !this.validateIdentity()) return;
    if (this.currentStep === TOTAL_STEPS - 1) {
      this.submitSetup();
      return;
    }
    this.goToStep(this.currentStep + 1);
  }

  private validateIdentity(): boolean {
    const name = this.cachedValues['setup-game-name'] ?? '';
    if (!name.trim()) {
      this.showError('Game name is required');
      const input = this.body.querySelector('#setup-game-name') as HTMLInputElement | null;
      input?.focus();
      return false;
    }
    return true;
  }

  private cacheCurrentValues(): void {
    const inputs = this.body.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    for (const input of inputs) {
      if (input.id) {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          this.cachedValues[input.id] = input.checked ? 'true' : 'false';
        } else {
          this.cachedValues[input.id] = input.value;
        }
      }
      if (input.dataset.settingKey) {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          this.cachedValues[`setting:${input.dataset.settingKey}`] = input.checked ? 'true' : 'false';
        } else {
          this.cachedValues[`setting:${input.dataset.settingKey}`] = input.value;
        }
      }
    }
  }

  private restoreCachedValues(): void {
    const inputs = this.body.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    for (const input of inputs) {
      const cached = (input.id ? this.cachedValues[input.id] : undefined)
        ?? (input.dataset.settingKey ? this.cachedValues[`setting:${input.dataset.settingKey}`] : undefined);

      if (cached !== undefined) {
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          input.checked = cached === 'true';
        } else {
          input.value = cached;
        }
      }
    }
  }

  private renderCurrentStep(): void {
    // Keep error el, remove everything else
    const children = Array.from(this.body.children);
    for (const child of children) {
      if (child !== this.errorEl) this.body.removeChild(child);
    }

    const stepEl = document.createElement('div');
    stepEl.className = 'setup-step active';

    switch (this.currentStep) {
      case 0: this.buildWelcomeStep(stepEl); break;
      case 1: this.buildIdentityStep(stepEl); break;
      case 2: this.buildLogoStep(stepEl); break;
      case 3: this.buildMechanicsStep(stepEl); break;
      case 4: this.buildCompleteStep(stepEl); break;
    }

    this.body.appendChild(stepEl);
  }

  private buildWelcomeStep(el: HTMLElement): void {
    el.innerHTML = `
      <h2>Set Up Your Game</h2>
      <p class="setup-subtitle">
        Let's set up your game. This wizard will walk you through configuring
        your game's identity, logo, and gameplay settings. You can change any
        of these later using the <strong>setup</strong> command in-game.
      </p>
      <p class="setup-subtitle">
        After setup, you'll create the first account which will automatically
        be promoted to administrator.
      </p>
    `;
  }

  private buildIdentityStep(el: HTMLElement): void {
    el.innerHTML = `
      <h2>Game Identity</h2>
      <p class="setup-subtitle">Configure your game's name and branding.</p>
      <div class="setup-field">
        <label for="setup-game-name">Game Name *</label>
        <input type="text" id="setup-game-name" value="MudForge" maxlength="50" data-1p-ignore="true" data-op-ignore="true">
      </div>
      <div class="setup-field">
        <label for="setup-tagline">Tagline</label>
        <input type="text" id="setup-tagline" value="Your Adventure Awaits" maxlength="100" data-1p-ignore="true" data-op-ignore="true">
      </div>
      <div class="setup-field">
        <label for="setup-description">Description</label>
        <textarea id="setup-description" rows="2" maxlength="250" data-1p-ignore="true" data-op-ignore="true">A Modern MUD Experience</textarea>
      </div>
      <div class="setup-field">
        <label for="setup-website">Website URL</label>
        <input type="url" id="setup-website" placeholder="https://yourgame.com" data-1p-ignore="true" data-op-ignore="true">
      </div>
      <div class="setup-field">
        <label for="setup-year">Established Year</label>
        <input type="number" id="setup-year" value="${new Date().getFullYear()}" min="1990" max="2099" data-1p-ignore="true" data-op-ignore="true">
      </div>
    `;
  }

  private buildLogoStep(el: HTMLElement): void {
    el.innerHTML = `
      <h2>Game Logo</h2>
      <p class="setup-subtitle">
        Upload a logo for your game. This will appear on the login screen.
        Logo is optional — you can skip this step.
      </p>
      <div class="setup-logo-area">
        <div class="setup-logo-preview" id="setup-logo-preview">
          <span class="setup-logo-placeholder">No logo selected</span>
        </div>
        <div class="setup-logo-upload">
          <input type="file" id="setup-logo-file" accept="image/png,image/jpeg,image/svg+xml" data-1p-ignore="true" data-op-ignore="true">
          <button type="button" class="setup-logo-btn" id="setup-logo-choose">Choose Image</button>
          <button type="button" class="setup-logo-clear hidden" id="setup-logo-remove">Remove</button>
        </div>
        <div class="setup-help">PNG, JPEG, or SVG. Maximum 256KB.</div>
      </div>
    `;

    const fileInput = el.querySelector('#setup-logo-file') as HTMLInputElement;
    const chooseBtn = el.querySelector('#setup-logo-choose') as HTMLButtonElement;
    const removeBtn = el.querySelector('#setup-logo-remove') as HTMLButtonElement;
    const preview = el.querySelector('#setup-logo-preview') as HTMLElement;

    chooseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (file.size > 256 * 1024) {
        this.showError('Logo must be 256KB or smaller');
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.logoDataUrl = reader.result as string;
        preview.innerHTML = `<img src="${this.escapeAttr(this.logoDataUrl)}" alt="Game logo preview">`;
        removeBtn.classList.remove('hidden');
        this.clearError();
      };
      reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', () => {
      this.logoDataUrl = null;
      fileInput.value = '';
      preview.innerHTML = '<span class="setup-logo-placeholder">No logo selected</span>';
      removeBtn.classList.add('hidden');
    });

    // Restore preview if logo was previously selected
    if (this.logoDataUrl) {
      preview.innerHTML = `<img src="${this.escapeAttr(this.logoDataUrl)}" alt="Game logo preview">`;
      removeBtn.classList.remove('hidden');
    }
  }

  private buildMechanicsStep(el: HTMLElement): void {
    el.innerHTML = `
      <h2>Game Mechanics</h2>
      <p class="setup-subtitle">Configure gameplay settings. All values are pre-filled with sensible defaults.</p>
    `;

    const settings = this.settingsData;
    if (Object.keys(settings).length === 0) {
      const loading = document.createElement('p');
      loading.className = 'setup-subtitle';
      loading.textContent = 'Loading settings...';
      el.appendChild(loading);
      return;
    }

    // Group by category
    const groups = new Map<string, Array<[string, SettingMeta]>>();
    for (const [key, meta] of Object.entries(settings)) {
      if (!groups.has(meta.category)) groups.set(meta.category, []);
      groups.get(meta.category)!.push([key, meta]);
    }

    for (const [category, entries] of groups) {
      const group = document.createElement('div');
      group.className = 'setup-group';

      const header = document.createElement('div');
      header.className = 'setup-group-header';

      const title = document.createElement('span');
      title.textContent = category;
      const chevron = document.createElement('span');
      chevron.className = 'setup-group-chevron';
      chevron.innerHTML = '&#9660;';
      header.appendChild(title);
      header.appendChild(chevron);
      header.addEventListener('click', () => group.classList.toggle('collapsed'));
      group.appendChild(header);

      const content = document.createElement('div');
      content.className = 'setup-group-content';

      for (const [key, meta] of entries) {
        if (meta.type === 'boolean') {
          content.appendChild(this.buildToggleRow(key, meta));
        } else if (meta.type === 'number') {
          content.appendChild(this.buildNumberRow(key, meta));
        } else {
          content.appendChild(this.buildStringRow(key, meta));
        }
      }

      group.appendChild(content);
      el.appendChild(group);
    }
  }

  private buildToggleRow(key: string, meta: SettingMeta): HTMLElement {
    const row = document.createElement('div');
    row.className = 'setup-toggle-row';

    const label = document.createElement('div');
    label.className = 'setup-toggle-label';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'setup-toggle-name';
    nameDiv.textContent = this.formatKey(key);
    const descDiv = document.createElement('div');
    descDiv.className = 'setup-toggle-desc';
    descDiv.textContent = meta.description;
    label.appendChild(nameDiv);
    label.appendChild(descDiv);

    const toggle = document.createElement('label');
    toggle.className = 'setup-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('data-op-ignore', 'true');
    input.checked = meta.value as boolean;
    input.dataset.settingKey = key;
    const slider = document.createElement('span');
    slider.className = 'setup-toggle-slider';
    toggle.appendChild(input);
    toggle.appendChild(slider);

    row.appendChild(label);
    row.appendChild(toggle);
    return row;
  }

  private buildNumberRow(key: string, meta: SettingMeta): HTMLElement {
    const row = document.createElement('div');
    row.className = 'setup-number-row';

    const label = document.createElement('div');
    label.className = 'setup-toggle-label';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'setup-toggle-name';
    nameDiv.textContent = this.formatKey(key);

    const constraints: string[] = [];
    if (meta.min !== undefined) constraints.push(`min: ${meta.min}`);
    if (meta.max !== undefined) constraints.push(`max: ${meta.max}`);
    const constraintStr = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';

    const descDiv = document.createElement('div');
    descDiv.className = 'setup-toggle-desc';
    descDiv.textContent = meta.description + constraintStr;
    label.appendChild(nameDiv);
    label.appendChild(descDiv);

    const input = document.createElement('input');
    input.type = 'number';
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('data-op-ignore', 'true');
    input.value = String(meta.value);
    if (meta.min !== undefined) input.min = String(meta.min);
    if (meta.max !== undefined) input.max = String(meta.max);
    input.dataset.settingKey = key;

    row.appendChild(label);
    row.appendChild(input);
    return row;
  }

  private buildStringRow(key: string, meta: SettingMeta): HTMLElement {
    const row = document.createElement('div');
    row.className = 'setup-string-row';

    const label = document.createElement('div');
    label.className = 'setup-toggle-label';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'setup-toggle-name';
    nameDiv.textContent = this.formatKey(key);
    const descDiv = document.createElement('div');
    descDiv.className = 'setup-toggle-desc';
    descDiv.textContent = meta.description;
    label.appendChild(nameDiv);
    label.appendChild(descDiv);

    row.appendChild(label);

    if (key === 'giphy.rating') {
      const select = document.createElement('select');
      select.dataset.settingKey = key;
      for (const val of ['g', 'pg', 'pg-13', 'r']) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val.toUpperCase();
        if (val === meta.value) opt.selected = true;
        select.appendChild(opt);
      }
      row.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('data-1p-ignore', 'true');
      input.setAttribute('data-op-ignore', 'true');
      input.value = String(meta.value ?? '');
      input.dataset.settingKey = key;
      row.appendChild(input);
    }

    return row;
  }

  private formatKey(key: string): string {
    const part = key.split('.').pop() || key;
    return part
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }

  private buildCompleteStep(el: HTMLElement): void {
    const gameName = this.cachedValues['setup-game-name'] || 'MudForge';
    const tagline = this.cachedValues['setup-tagline'] || 'Your Adventure Awaits';

    const heading = document.createElement('h2');
    heading.textContent = 'Your Game is Ready!';
    el.appendChild(heading);

    const subtitle = document.createElement('p');
    subtitle.className = 'setup-subtitle';
    subtitle.textContent = 'Everything is configured. Click below to save your settings and proceed to create your administrator account.';
    el.appendChild(subtitle);

    const summary = document.createElement('div');
    summary.className = 'setup-complete-summary';

    const nameEl = document.createElement('div');
    nameEl.className = 'setup-game-name';
    nameEl.textContent = gameName;
    summary.appendChild(nameEl);

    const taglineEl = document.createElement('div');
    taglineEl.className = 'setup-game-tagline';
    taglineEl.textContent = tagline;
    summary.appendChild(taglineEl);

    el.appendChild(summary);

    const note = document.createElement('p');
    note.className = 'setup-complete-note';
    note.textContent = 'The first account you create will automatically have administrator privileges.';
    el.appendChild(note);
  }

  private async submitSetup(): Promise<void> {
    this.nextBtn.classList.add('loading');
    this.nextBtn.disabled = true;
    this.clearError();

    const game = {
      name: (this.cachedValues['setup-game-name'] || 'MudForge').trim(),
      tagline: (this.cachedValues['setup-tagline'] || 'Your Adventure Awaits').trim(),
      description: (this.cachedValues['setup-description'] || 'A Modern MUD Experience').trim(),
      website: (this.cachedValues['setup-website'] || '').trim(),
      establishedYear: parseInt(this.cachedValues['setup-year'] || String(new Date().getFullYear()), 10),
    };

    if (!game.name) {
      this.showError('Game name is required');
      this.nextBtn.classList.remove('loading');
      this.nextBtn.disabled = false;
      return;
    }

    // Gather config settings
    const config: Record<string, unknown> = {};
    for (const [key, meta] of Object.entries(this.settingsData)) {
      const cached = this.cachedValues[`setting:${key}`];
      if (cached !== undefined) {
        if (meta.type === 'boolean') {
          config[key] = cached === 'true';
        } else if (meta.type === 'number') {
          config[key] = parseFloat(cached);
        } else {
          config[key] = cached;
        }
      } else {
        config[key] = meta.value;
      }
    }

    try {
      const resp = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          logo: this.logoDataUrl || undefined,
          config,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Setup failed');
      }

      this.hide();
      this.onComplete();
    } catch (err) {
      this.showError(err instanceof Error ? err.message : 'Setup failed');
      this.nextBtn.classList.remove('loading');
      this.nextBtn.disabled = false;
    }
  }

  private showError(msg: string): void {
    this.errorEl.textContent = msg;
    this.errorEl.classList.add('visible');
  }

  private clearError(): void {
    this.errorEl.textContent = '';
    this.errorEl.classList.remove('visible');
  }

  private escapeAttr(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
}
