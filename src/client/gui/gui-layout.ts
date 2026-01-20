/**
 * GUI Layout - Renders layout containers
 */

import type { LayoutContainer } from './gui-types.js';
import { applyStyle } from './gui-elements.js';

type ChildRenderer = (child: LayoutContainer | unknown) => HTMLElement;

/**
 * Render a layout container.
 */
export function renderLayout(
  layout: LayoutContainer,
  renderChild: ChildRenderer
): HTMLElement {
  let container: HTMLElement;

  switch (layout.type) {
    case 'vertical':
      container = createVerticalLayout(layout);
      break;
    case 'horizontal':
      container = createHorizontalLayout(layout);
      break;
    case 'grid':
      container = createGridLayout(layout);
      break;
    case 'tabs':
      container = createTabsLayout(layout, renderChild);
      // Tabs handle their own children, so return early
      if (layout.id) container.id = `gui-layout-${layout.id}`;
      if (layout.className) container.classList.add(layout.className);
      return container;
    case 'form':
      container = createFormLayout(layout);
      break;
    default:
      container = document.createElement('div');
  }

  // Render children
  for (const child of layout.children) {
    container.appendChild(renderChild(child));
  }

  if (layout.id) {
    container.id = `gui-layout-${layout.id}`;
  }
  if (layout.className) {
    container.classList.add(layout.className);
  }

  return container;
}

function createVerticalLayout(layout: LayoutContainer): HTMLElement {
  const div = document.createElement('div');
  div.className = 'gui-layout-vertical';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  if (layout.gap) div.style.gap = layout.gap;
  applyStyle(div, layout.style);
  return div;
}

function createHorizontalLayout(layout: LayoutContainer): HTMLElement {
  const div = document.createElement('div');
  div.className = 'gui-layout-horizontal';
  div.style.display = 'flex';
  div.style.flexDirection = 'row';
  div.style.alignItems = 'flex-start';
  if (layout.gap) div.style.gap = layout.gap;
  applyStyle(div, layout.style);
  return div;
}

function createGridLayout(layout: LayoutContainer): HTMLElement {
  const div = document.createElement('div');
  div.className = 'gui-layout-grid';
  div.style.display = 'grid';

  if (typeof layout.columns === 'number') {
    div.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
  } else if (layout.columns) {
    div.style.gridTemplateColumns = layout.columns;
  }

  if (layout.rows) {
    div.style.gridTemplateRows = layout.rows;
  }

  if (layout.gap) div.style.gap = layout.gap;
  applyStyle(div, layout.style);
  return div;
}

function createTabsLayout(
  layout: LayoutContainer,
  renderChild: ChildRenderer
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gui-layout-tabs';
  applyStyle(wrapper, layout.style);

  // Tab headers
  const tabHeaders = document.createElement('div');
  tabHeaders.className = 'gui-tab-headers';

  // Tab content panels
  const tabPanels = document.createElement('div');
  tabPanels.className = 'gui-tab-panels';

  // Determine default tab index
  let defaultTabIndex = 0;
  if (layout.defaultTab !== undefined) {
    if (typeof layout.defaultTab === 'number') {
      defaultTabIndex = layout.defaultTab;
    } else {
      // Find tab by tabId
      const tabIndex = layout.children.findIndex(
        (child) => (child as LayoutContainer).tabId === layout.defaultTab
      );
      if (tabIndex !== -1) defaultTabIndex = tabIndex;
    }
  }

  // Process tab children
  layout.children.forEach((child, index) => {
    const tabChild = child as LayoutContainer;
    const isActive = index === defaultTabIndex;

    // Create tab header
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'gui-tab-header';
    header.textContent = tabChild.tabLabel ?? `Tab ${index + 1}`;
    header.dataset.tabIndex = String(index);
    if (isActive) header.classList.add('active');

    // Create tab panel
    const panel = document.createElement('div');
    panel.className = 'gui-tab-panel';
    panel.dataset.tabIndex = String(index);
    if (!isActive) panel.style.display = 'none';
    panel.appendChild(renderChild(child));

    // Tab switching
    header.addEventListener('click', () => {
      // Deactivate all tabs
      wrapper.querySelectorAll('.gui-tab-header').forEach(h => {
        h.classList.remove('active');
      });
      wrapper.querySelectorAll('.gui-tab-panel').forEach(p => {
        (p as HTMLElement).style.display = 'none';
      });

      // Activate this tab
      header.classList.add('active');
      panel.style.display = 'block';
    });

    tabHeaders.appendChild(header);
    tabPanels.appendChild(panel);
  });

  wrapper.appendChild(tabHeaders);
  wrapper.appendChild(tabPanels);

  return wrapper;
}

function createFormLayout(layout: LayoutContainer): HTMLElement {
  const form = document.createElement('div');
  form.className = 'gui-layout-form';
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  if (layout.gap) form.style.gap = layout.gap;
  applyStyle(form, layout.style);
  return form;
}
