/**
 * SkyPanel - Graphical day/night cycle widget.
 *
 * Renders an SVG sky scene in the right sidebar showing:
 * - Sun tracing an arc across the sky during daytime (hours 5–20)
 * - Moon (crescent) tracing an arc during nighttime (hours 20–5)
 * - Sky gradient that shifts smoothly through dawn/day/dusk/night
 * - Stars that fade in at dusk and out at dawn
 * - Phase label + game time info bar
 */

import type { GameTimeMessage } from './websocket-client.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLLAPSED_STORAGE_KEY = 'mudforge-sky-collapsed';

/**
 * Sky gradient keyframe — defines top, mid, and horizon colors at a given hour.
 */
interface SkyKeyframe {
  hour: number;
  top: [number, number, number];
  mid: [number, number, number];
  horizon: [number, number, number];
}

/**
 * Sky gradient keyframes by hour.
 */
const SKY_KEYFRAMES: SkyKeyframe[] = [
  { hour: 0,  top: [10, 10, 46],  mid: [13, 16, 64],  horizon: [17, 17, 85] },
  { hour: 5,  top: [10, 10, 46],  mid: [13, 16, 64],  horizon: [17, 17, 85] },
  { hour: 6,  top: [45, 27, 78],  mid: [139, 58, 98],  horizon: [232, 114, 58] },
  { hour: 7,  top: [26, 58, 92],  mid: [58, 122, 189], horizon: [135, 206, 235] },
  { hour: 17, top: [26, 58, 92],  mid: [58, 122, 189], horizon: [135, 206, 235] },
  { hour: 18, top: [80, 31, 70],  mid: [170, 80, 60],  horizon: [240, 130, 50] },
  { hour: 19, top: [45, 27, 78],  mid: [139, 58, 98],  horizon: [232, 114, 58] },
  { hour: 20, top: [10, 10, 46],  mid: [13, 16, 64],  horizon: [17, 17, 85] },
  { hour: 24, top: [10, 10, 46],  mid: [13, 16, 64],  horizon: [17, 17, 85] },
];

/**
 * Fixed star positions in the upper sky area (x: 0-200, y: 5-50).
 */
const STAR_POSITIONS: [number, number, number][] = [
  [15, 10, 1.2], [35, 25, 0.8], [52, 8, 1.0], [68, 30, 0.7],
  [80, 15, 1.1], [95, 22, 0.9], [110, 10, 0.8], [125, 28, 1.0],
  [140, 12, 0.7], [155, 24, 1.2], [170, 8, 0.9], [185, 20, 1.0],
  [25, 40, 0.8], [55, 45, 0.7], [90, 38, 1.0], [120, 42, 0.9],
  [150, 35, 0.8], [175, 40, 1.1], [45, 18, 0.6], [130, 18, 0.7],
];

/**
 * Phase display names and CSS class suffixes.
 */
const PHASE_INFO: Record<string, { label: string; className: string }> = {
  dawn:  { label: 'Dawn',  className: 'dawn' },
  day:   { label: 'Day',   className: 'day' },
  dusk:  { label: 'Dusk',  className: 'dusk' },
  night: { label: 'Night', className: 'night' },
};

/**
 * Linearly interpolate between two RGB colors.
 */
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Get interpolated sky colors for a given fractional hour.
 */
function getSkyColors(fracHour: number): { top: string; mid: string; horizon: string } {
  // Clamp to [0, 24)
  const h = ((fracHour % 24) + 24) % 24;

  // Find surrounding keyframes
  let lower = SKY_KEYFRAMES[0];
  let upper = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];

  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    if (h >= SKY_KEYFRAMES[i].hour && h <= SKY_KEYFRAMES[i + 1].hour) {
      lower = SKY_KEYFRAMES[i];
      upper = SKY_KEYFRAMES[i + 1];
      break;
    }
  }

  const range = upper.hour - lower.hour;
  const t = range === 0 ? 0 : (h - lower.hour) / range;

  return {
    top: lerpColor(lower.top, upper.top, t),
    mid: lerpColor(lower.mid, upper.mid, t),
    horizon: lerpColor(lower.horizon, upper.horizon, t),
  };
}

/**
 * Get star opacity for a given fractional hour.
 */
function getStarOpacity(fracHour: number): number {
  const h = ((fracHour % 24) + 24) % 24;

  if (h >= 20 || h < 5) return 1.0;          // Night: full stars
  if (h >= 5 && h < 7) return 1.0 - (h - 5) / 2;  // Dawn: fade out
  if (h >= 7 && h < 18) return 0.0;           // Day: no stars
  if (h >= 18 && h < 20) return (h - 18) / 2; // Dusk: fade in
  return 0.0;
}

/**
 * Compute sun position on a semicircular arc.
 * Sun visible hours 5–20.
 */
function computeSunPosition(fracHour: number): { x: number; y: number; visible: boolean } {
  const h = ((fracHour % 24) + 24) % 24;
  if (h < 5 || h > 20) return { x: 100, y: 90, visible: false };

  const t = (h - 5) / 15; // 0 at hour 5, 1 at hour 20
  const angle = Math.PI - t * Math.PI; // PI to 0 (left to right)
  const cx = 100, cy = 78, r = 68;
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
    visible: true,
  };
}

/**
 * Compute moon position on a semicircular arc.
 * Moon visible hours 20–5 (next day).
 */
function computeMoonPosition(fracHour: number): { x: number; y: number; visible: boolean } {
  const h = ((fracHour % 24) + 24) % 24;

  // Moon visible 20–24 and 0–5 → 9-hour window
  let t: number;
  if (h >= 20) {
    t = (h - 20) / 9;
  } else if (h < 5) {
    t = (h + 4) / 9;
  } else {
    return { x: 100, y: 90, visible: false };
  }

  const angle = Math.PI - t * Math.PI;
  const cx = 100, cy = 78, r = 68;
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
    visible: true,
  };
}

/**
 * SkyPanel class — renders and animates the sky scene widget.
 */
export class SkyPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isCollapsed: boolean = false;
  private updateInterval: number | null = null;

  // SVG element refs
  private svgEl: SVGSVGElement | null = null;
  private gradStopTop: SVGStopElement | null = null;
  private gradStopMid: SVGStopElement | null = null;
  private gradStopHorizon: SVGStopElement | null = null;
  private starsGroup: SVGGElement | null = null;
  private sunGroup: SVGGElement | null = null;
  private moonGroup: SVGGElement | null = null;
  private phaseLabel: HTMLElement | null = null;
  private timeLabel: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;

  // Game time sync state (same as ClockPanel)
  private gameTimeHour: number = 12;
  private gameTimeMinute: number = 0;
  private gameTimePhase: string = 'day';
  private gameTimeCycleDurationMs: number = 3600000;
  private gameTimeSyncTime: number = 0;
  private hasGameTime: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Sky container #${containerId} not found`);
    }
    this.container = container;

    // Create panel structure
    this.panel = document.createElement('div');
    this.panel.className = 'sky-panel';

    this.buildPanel();
    this.container.appendChild(this.panel);

    // Restore collapsed state
    this.restoreCollapsedState();

    // Start update loop
    this.startUpdateLoop();

    // Initial render
    this.update();
  }

  /**
   * Handle a game time message from the server.
   */
  handleGameTimeMessage(message: GameTimeMessage): void {
    this.gameTimeHour = message.hour;
    this.gameTimeMinute = message.minute;
    this.gameTimePhase = message.phase;
    this.gameTimeCycleDurationMs = message.cycleDurationMs;
    this.gameTimeSyncTime = Date.now();
    this.hasGameTime = true;
    this.update();
  }

  /**
   * Get the current interpolated game time (same logic as ClockPanel).
   */
  private getCurrentGameTime(): { hour: number; minute: number; phase: string } {
    if (!this.hasGameTime) {
      return { hour: this.gameTimeHour, minute: this.gameTimeMinute, phase: this.gameTimePhase };
    }

    const elapsedMs = Date.now() - this.gameTimeSyncTime;
    const gameMinutesPerMs = 1440 / this.gameTimeCycleDurationMs;
    const elapsedGameMinutes = elapsedMs * gameMinutesPerMs;

    const totalMinutes = this.gameTimeHour * 60 + this.gameTimeMinute + elapsedGameMinutes;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = Math.floor(totalMinutes % 60);

    let phase: string;
    if (hour >= 5 && hour < 7) phase = 'dawn';
    else if (hour >= 7 && hour < 18) phase = 'day';
    else if (hour >= 18 && hour < 20) phase = 'dusk';
    else phase = 'night';

    return { hour, minute, phase };
  }

  /**
   * Toggle collapsed state.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
    this.saveCollapsedState();
  }

  /**
   * Stop the update loop.
   */
  stop(): void {
    if (this.updateInterval !== null) {
      window.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Build the panel DOM structure.
   */
  private buildPanel(): void {
    // Header
    const header = document.createElement('div');
    header.className = 'sky-panel-header';

    const title = document.createElement('span');
    title.className = 'sky-panel-title';
    title.textContent = 'Sky';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sky-btn sky-btn-toggle';
    toggleBtn.title = 'Toggle sky panel';
    toggleBtn.textContent = '_';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    header.appendChild(title);
    header.appendChild(toggleBtn);
    this.panel.appendChild(header);

    // Content area (SVG scene)
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'sky-panel-content';

    this.svgEl = this.buildSVG();
    this.contentEl.appendChild(this.svgEl);
    this.panel.appendChild(this.contentEl);

    // Info bar
    this.infoEl = document.createElement('div');
    this.infoEl.className = 'sky-panel-info';

    this.phaseLabel = document.createElement('span');
    this.phaseLabel.className = 'sky-phase-label';

    this.timeLabel = document.createElement('span');
    this.timeLabel.className = 'sky-time-label';

    this.infoEl.appendChild(this.phaseLabel);
    this.infoEl.appendChild(this.timeLabel);
    this.panel.appendChild(this.infoEl);
  }

  /**
   * Build the SVG sky scene.
   */
  private buildSVG(): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 90');
    svg.setAttribute('class', 'sky-svg');
    svg.setAttribute('preserveAspectRatio', 'none');

    // Defs — gradients
    const defs = document.createElementNS(SVG_NS, 'defs');

    // Sky gradient (vertical)
    const skyGrad = document.createElementNS(SVG_NS, 'linearGradient');
    skyGrad.setAttribute('id', 'sky-gradient');
    skyGrad.setAttribute('x1', '0');
    skyGrad.setAttribute('y1', '0');
    skyGrad.setAttribute('x2', '0');
    skyGrad.setAttribute('y2', '1');

    this.gradStopTop = document.createElementNS(SVG_NS, 'stop');
    this.gradStopTop.setAttribute('offset', '0%');
    this.gradStopTop.setAttribute('stop-color', '#0a0a2e');

    this.gradStopMid = document.createElementNS(SVG_NS, 'stop');
    this.gradStopMid.setAttribute('offset', '50%');
    this.gradStopMid.setAttribute('stop-color', '#0d1040');

    this.gradStopHorizon = document.createElementNS(SVG_NS, 'stop');
    this.gradStopHorizon.setAttribute('offset', '100%');
    this.gradStopHorizon.setAttribute('stop-color', '#111155');

    skyGrad.appendChild(this.gradStopTop);
    skyGrad.appendChild(this.gradStopMid);
    skyGrad.appendChild(this.gradStopHorizon);
    defs.appendChild(skyGrad);

    // Sun glow gradient (radial)
    const sunGlow = document.createElementNS(SVG_NS, 'radialGradient');
    sunGlow.setAttribute('id', 'sun-glow');
    const sunGlowS1 = document.createElementNS(SVG_NS, 'stop');
    sunGlowS1.setAttribute('offset', '0%');
    sunGlowS1.setAttribute('stop-color', 'rgba(255,200,50,0.6)');
    const sunGlowS2 = document.createElementNS(SVG_NS, 'stop');
    sunGlowS2.setAttribute('offset', '100%');
    sunGlowS2.setAttribute('stop-color', 'rgba(255,200,50,0)');
    sunGlow.appendChild(sunGlowS1);
    sunGlow.appendChild(sunGlowS2);
    defs.appendChild(sunGlow);

    // Moon glow gradient (radial)
    const moonGlow = document.createElementNS(SVG_NS, 'radialGradient');
    moonGlow.setAttribute('id', 'moon-glow');
    const moonGlowS1 = document.createElementNS(SVG_NS, 'stop');
    moonGlowS1.setAttribute('offset', '0%');
    moonGlowS1.setAttribute('stop-color', 'rgba(200,210,255,0.4)');
    const moonGlowS2 = document.createElementNS(SVG_NS, 'stop');
    moonGlowS2.setAttribute('offset', '100%');
    moonGlowS2.setAttribute('stop-color', 'rgba(200,210,255,0)');
    moonGlow.appendChild(moonGlowS1);
    moonGlow.appendChild(moonGlowS2);
    defs.appendChild(moonGlow);

    svg.appendChild(defs);

    // Sky background
    const skyRect = document.createElementNS(SVG_NS, 'rect');
    skyRect.setAttribute('x', '0');
    skyRect.setAttribute('y', '0');
    skyRect.setAttribute('width', '200');
    skyRect.setAttribute('height', '78');
    skyRect.setAttribute('fill', 'url(#sky-gradient)');
    svg.appendChild(skyRect);

    // Stars
    this.starsGroup = document.createElementNS(SVG_NS, 'g');
    this.starsGroup.setAttribute('class', 'sky-stars');
    for (const [sx, sy, sr] of STAR_POSITIONS) {
      const star = document.createElementNS(SVG_NS, 'circle');
      star.setAttribute('cx', String(sx));
      star.setAttribute('cy', String(sy));
      star.setAttribute('r', String(sr));
      star.setAttribute('fill', '#ffffff');
      this.starsGroup.appendChild(star);
    }
    svg.appendChild(this.starsGroup);

    // Horizon line
    const horizon = document.createElementNS(SVG_NS, 'line');
    horizon.setAttribute('x1', '0');
    horizon.setAttribute('y1', '78');
    horizon.setAttribute('x2', '200');
    horizon.setAttribute('y2', '78');
    horizon.setAttribute('stroke', '#2a2a30');
    horizon.setAttribute('stroke-width', '0.5');
    svg.appendChild(horizon);

    // Ground fill
    const ground = document.createElementNS(SVG_NS, 'rect');
    ground.setAttribute('x', '0');
    ground.setAttribute('y', '78');
    ground.setAttribute('width', '200');
    ground.setAttribute('height', '12');
    ground.setAttribute('fill', '#0d0d0f');
    svg.appendChild(ground);

    // Sun group
    this.sunGroup = document.createElementNS(SVG_NS, 'g');
    this.sunGroup.setAttribute('class', 'sky-sun-group');

    const sunGlowCircle = document.createElementNS(SVG_NS, 'circle');
    sunGlowCircle.setAttribute('r', '12');
    sunGlowCircle.setAttribute('fill', 'url(#sun-glow)');
    this.sunGroup.appendChild(sunGlowCircle);

    const sunCore = document.createElementNS(SVG_NS, 'circle');
    sunCore.setAttribute('r', '5');
    sunCore.setAttribute('fill', '#ffd700');
    this.sunGroup.appendChild(sunCore);

    svg.appendChild(this.sunGroup);

    // Moon group
    this.moonGroup = document.createElementNS(SVG_NS, 'g');
    this.moonGroup.setAttribute('class', 'sky-moon-group');

    const moonGlowCircle = document.createElementNS(SVG_NS, 'circle');
    moonGlowCircle.setAttribute('r', '10');
    moonGlowCircle.setAttribute('fill', 'url(#moon-glow)');
    this.moonGroup.appendChild(moonGlowCircle);

    const moonBody = document.createElementNS(SVG_NS, 'circle');
    moonBody.setAttribute('r', '4.5');
    moonBody.setAttribute('fill', '#c8d0e8');
    this.moonGroup.appendChild(moonBody);

    // Crescent shadow overlay
    const moonShadow = document.createElementNS(SVG_NS, 'circle');
    moonShadow.setAttribute('cx', '2.5');
    moonShadow.setAttribute('cy', '-1');
    moonShadow.setAttribute('r', '4');
    moonShadow.setAttribute('fill', '#1a1a2e');
    this.moonGroup.appendChild(moonShadow);

    svg.appendChild(this.moonGroup);

    return svg;
  }

  /**
   * Update the sky scene based on current game time.
   */
  private update(): void {
    const { hour, minute, phase } = this.getCurrentGameTime();
    const fracHour = hour + minute / 60;

    // Update sky gradient
    const colors = getSkyColors(fracHour);
    this.gradStopTop?.setAttribute('stop-color', colors.top);
    this.gradStopMid?.setAttribute('stop-color', colors.mid);
    this.gradStopHorizon?.setAttribute('stop-color', colors.horizon);

    // Update stars
    const starOpacity = getStarOpacity(fracHour);
    if (this.starsGroup) {
      this.starsGroup.style.opacity = String(starOpacity);
    }

    // Update sun
    const sun = computeSunPosition(fracHour);
    if (this.sunGroup) {
      if (sun.visible) {
        this.sunGroup.style.display = '';
        this.sunGroup.setAttribute('transform', `translate(${sun.x.toFixed(1)},${sun.y.toFixed(1)})`);
      } else {
        this.sunGroup.style.display = 'none';
      }
    }

    // Update moon
    const moon = computeMoonPosition(fracHour);
    if (this.moonGroup) {
      if (moon.visible) {
        this.moonGroup.style.display = '';
        this.moonGroup.setAttribute('transform', `translate(${moon.x.toFixed(1)},${moon.y.toFixed(1)})`);
      } else {
        this.moonGroup.style.display = 'none';
      }
    }

    // Update info bar
    const phaseInfo = PHASE_INFO[phase] || PHASE_INFO.day;
    if (this.phaseLabel) {
      this.phaseLabel.textContent = phaseInfo.label;
      this.phaseLabel.className = `sky-phase-label sky-phase-${phaseInfo.className}`;
    }
    if (this.timeLabel) {
      this.timeLabel.textContent = `${hour}:${String(minute).padStart(2, '0')}`;
    }
  }

  /**
   * Start the local update loop (every second).
   */
  private startUpdateLoop(): void {
    if (this.updateInterval !== null) return;
    this.updateInterval = window.setInterval(() => {
      this.update();
    }, 1000);
  }

  /**
   * Restore collapsed state from localStorage.
   */
  private restoreCollapsedState(): void {
    try {
      const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (saved === 'true') {
        this.isCollapsed = true;
        this.panel.classList.add('collapsed');
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save collapsed state to localStorage.
   */
  private saveCollapsedState(): void {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(this.isCollapsed));
    } catch {
      // Ignore storage errors
    }
  }
}

export default SkyPanel;
