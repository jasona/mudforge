/**
 * Shop Modal - Build and display the merchant shop GUI.
 *
 * Creates a three-panel modal:
 * - Left: Merchant wares (items for sale)
 * - Center: Transaction ledger (running totals)
 * - Right: Player inventory (items to sell)
 *
 * Supports merged transaction flow where players can buy AND sell
 * items in a single transaction.
 */

import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  GUICloseMessage,
  GUIClientMessage,
  LayoutContainer,
  DisplayElement,
  InputElement,
  ModalButton,
} from './gui-types.js';
import type { MudObject } from '../std/object.js';
import type { Item } from '../std/item.js';
import type {
  ShopItemDisplay,
  TransactionState,
  LedgerSummary,
  BuyEntry,
  SellEntry,
} from './shop-types.js';
import { detectItemCategory } from './shop-types.js';
import { getPortraitDaemon } from '../daemons/portrait.js';

/**
 * Player interface for shop operations.
 */
interface ShopPlayer extends MudObject {
  gold: number;
  objectId: string;
  inventory: Item[];
  stats?: { charisma?: number };
  onGUIResponse?: (msg: GUIClientMessage) => Promise<void>;
}

/**
 * Merchant interface for shop operations.
 */
interface ShopMerchant extends MudObject {
  shopName: string;
  shopDescription: string;
  shopGold: number;
  getStock(): Array<{
    itemPath: string;
    name: string;
    buyPrice: number;
    stock: number;
    category?: string;
  }>;
  getSoldItems(): Array<{
    objectId: string;
    name: string;
    sellPrice: number;
    category: string;
  }>;
  getSoldItemObject(objectId: string): Item | undefined;
  getCategories(): string[];
  getSellPrice(itemPath: string, player: ShopPlayer): number;
  getBaseSellPrice(itemPath: string): number;
  getBuyPrice(item: Item, player: ShopPlayer): number;
  getBaseBuyPrice(item: Item): number;
  acceptsItem(item: Item): boolean;
  getTransactionState(player: ShopPlayer): TransactionState;
  addToBuyCart(player: ShopPlayer, itemPath: string, quantity?: number): boolean;
  addSoldItemToBuyCart(player: ShopPlayer, objectId: string): boolean;
  getQuantityInCart(player: ShopPlayer, itemPath: string): number;
  getAvailableStock(player: ShopPlayer, itemPath: string): number;
  setCartQuantity(player: ShopPlayer, itemPath: string, quantity: number): boolean;
  addToSellCart(player: ShopPlayer, itemId: string): boolean;
  removeFromBuyCart(player: ShopPlayer, itemPath: string): boolean;
  removeFromSellCart(player: ShopPlayer, itemId: string): boolean;
  clearCart(player: ShopPlayer): void;
  calculateLedger(state: TransactionState, playerGold: number): LedgerSummary;
  finalizeTransaction(player: ShopPlayer): Promise<{
    success: boolean;
    message: string;
    itemsBought: string[];
    itemsSold: string[];
    goldSpent: number;
    goldReceived: number;
    netGold: number;
  }>;
  isInStock(itemPath: string): boolean;
  getCharismaModifier(player: ShopPlayer): number;
}

const MODAL_ID = 'shop-modal';

// Store active merchant reference for GUI response handling
const activeMerchants = new Map<string, ShopMerchant>();

/**
 * Open the shop modal for a player.
 */
export async function openShopModal(
  player: ShopPlayer,
  merchant: ShopMerchant
): Promise<void> {
  if (typeof efuns === 'undefined') {
    console.error('[ShopModal] efuns is undefined');
    return;
  }
  if (!efuns.guiSend) {
    console.error('[ShopModal] efuns.guiSend is not available');
    return;
  }

  try {
    // Store merchant reference for GUI response handling
    activeMerchants.set(player.objectId, merchant);

    // Set up GUI response handler
    player.onGUIResponse = async (msg: GUIClientMessage) => {
      await handleShopResponse(player, merchant, msg);
    };

    const state = merchant.getTransactionState(player);
    const layout = buildShopLayout(player, merchant, state);

    const message: GUIOpenMessage = {
      action: 'open',
      modal: {
        id: MODAL_ID,
        title: merchant.shopName,
        subtitle: merchant.shopDescription || undefined,
        size: 'large',
        closable: true,
        escapable: true,
      },
      layout,
      buttons: buildButtons(state, merchant.calculateLedger(state, player.gold)),
    };

    efuns.guiSend(message);

    // Load images asynchronously after modal is displayed
    loadShopImages(player, merchant, state).catch(() => {
      // Ignore errors - fallback images will remain
    });
  } catch (error) {
    console.error('[ShopModal] Error opening shop modal:', error);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Update the shop modal with current state.
 */
export function updateShopModal(
  player: ShopPlayer,
  merchant: ShopMerchant
): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const state = merchant.getTransactionState(player);
  const layout = buildShopLayout(player, merchant, state);

  // Send full layout update by reopening
  const openMessage: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: MODAL_ID,
      title: merchant.shopName,
      subtitle: merchant.shopDescription || undefined,
      size: 'large',
      closable: true,
      escapable: true,
    },
    layout,
    buttons: buildButtons(state, merchant.calculateLedger(state, player.gold)),
  };

  try {
    efuns.guiSend(openMessage);

    // Load images asynchronously after modal is displayed
    loadShopImages(player, merchant, state).catch(() => {
      // Ignore errors - fallback images will remain
    });
  } catch {
    // Modal may have been closed
  }
}

/**
 * Close the shop modal.
 */
export function closeShopModal(player: ShopPlayer): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  // Clean up
  activeMerchants.delete(player.objectId);
  player.onGUIResponse = undefined;

  const message: GUICloseMessage = {
    action: 'close',
    modalId: MODAL_ID,
  };

  try {
    efuns.guiSend(message);
  } catch {
    // Modal already closed
  }
}

/**
 * Load images for shop items asynchronously and update the modal.
 * This runs after the modal is displayed with fallback images.
 */
async function loadShopImages(
  player: ShopPlayer,
  merchant: ShopMerchant,
  state: TransactionState
): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const portraitDaemon = getPortraitDaemon();
  const fallback = portraitDaemon.getFallbackImage('item');

  // Fetch all shop images in parallel
  const stockPromises = merchant.getStock().map(async (item) => {
    if (typeof efuns.findObject !== 'function') return null;
    try {
      const obj = efuns.findObject(item.itemPath);
      if (!obj) return null;
      const image = await portraitDaemon.getObjectImage(obj, detectItemCategory(obj) as 'item');
      if (image !== fallback) {
        return { key: `item-img-${item.itemPath}`, src: image };
      }
    } catch {
      // Keep fallback
    }
    return null;
  });

  const soldPromises = merchant.getSoldItems().map(async (item) => {
    const itemObj = merchant.getSoldItemObject(item.objectId);
    if (!itemObj) return null;
    try {
      const image = await portraitDaemon.getObjectImage(itemObj, detectItemCategory(itemObj) as 'item');
      if (image !== fallback) {
        return { key: `sold-img-${item.objectId}`, src: image };
      }
    } catch {
      // Keep fallback
    }
    return null;
  });

  const invPromises = (player.inventory || []).map(async (item) => {
    try {
      const image = await portraitDaemon.getObjectImage(item, detectItemCategory(item) as 'item');
      if (image !== fallback) {
        return { key: `inv-img-${item.objectId}`, src: image };
      }
    } catch {
      // Keep fallback
    }
    return null;
  });

  const results = await Promise.allSettled([...stockPromises, ...soldPromises, ...invPromises]);
  const updates: Record<string, { src: string }> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      updates[result.value.key] = { src: result.value.src };
    }
  }

  // Send batch update if we have any images to update
  if (Object.keys(updates).length > 0) {
    try {
      const updateMessage: GUIUpdateMessage = {
        action: 'update',
        modalId: MODAL_ID,
        updates: {
          elements: updates,
        },
      };
      efuns.guiSend(updateMessage);
    } catch {
      // Modal may have been closed
    }
  }
}

/**
 * Build the complete shop layout.
 */
function buildShopLayout(
  player: ShopPlayer,
  merchant: ShopMerchant,
  state: TransactionState
): LayoutContainer {
  const waresPanel = buildWaresPanel(player, merchant, state);
  const ledgerPanel = buildLedgerPanel(state, player.gold, merchant);
  const inventoryPanel = buildInventoryPanel(player, merchant, state);

  return {
    type: 'vertical',
    gap: '12px',
    style: { padding: '4px' },
    children: [
      // Gold display
      {
        type: 'horizontal',
        gap: '8px',
        style: {
          justifyContent: 'flex-end',
          padding: '4px 8px',
          backgroundColor: '#1a1a2e',
          borderRadius: '4px',
        },
        children: [
          {
            type: 'text',
            id: 'gold-label',
            content: 'Your Gold:',
            style: { color: '#888', fontSize: '14px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'gold-amount',
            content: `${player.gold.toLocaleString()}`,
            style: { color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' },
          } as DisplayElement,
        ],
      },
      // Main three-panel layout
      {
        type: 'horizontal',
        gap: '12px',
        style: { flex: '1', minHeight: '400px' },
        children: [waresPanel, ledgerPanel, inventoryPanel],
      },
    ],
  };
}

/**
 * Build the merchant wares panel (left).
 */
function buildWaresPanel(
  player: ShopPlayer,
  merchant: ShopMerchant,
  state: TransactionState
): LayoutContainer {
  const stock = merchant.getStock();
  const soldItems = merchant.getSoldItems();
  const categories = merchant.getCategories();

  // Track items in buy cart (by itemPath for stock, objectId for sold)
  const stockInCart = new Set(
    state.itemsToBuy.filter((e) => !e.isSoldItem).map((e) => e.itemPath)
  );
  const soldInCart = new Set(
    state.itemsToBuy.filter((e) => e.isSoldItem).map((e) => e.objectId)
  );

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'wares-heading',
      content: 'Merchant Wares',
      level: 4,
      style: { color: '#60a5fa', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  // Group stock items by category
  type StockEntry = { type: 'stock'; item: (typeof stock)[0] };
  type SoldEntry = { type: 'sold'; item: (typeof soldItems)[0] };
  const itemsByCategory = new Map<string, Array<StockEntry | SoldEntry>>();

  for (const item of stock) {
    if (item.stock === 0) continue; // Out of stock
    const cat = item.category || 'misc';
    if (!itemsByCategory.has(cat)) {
      itemsByCategory.set(cat, []);
    }
    itemsByCategory.get(cat)!.push({ type: 'stock', item });
  }

  // Add sold items to categories
  for (const item of soldItems) {
    const cat = item.category || 'misc';
    if (!itemsByCategory.has(cat)) {
      itemsByCategory.set(cat, []);
    }
    itemsByCategory.get(cat)!.push({ type: 'sold', item });
  }

  // Build items grouped by category
  const scrollContent: Array<LayoutContainer | DisplayElement> = [];

  // Sort categories - use merchant's categories first, then any new ones from sold items
  const allCategories = new Set([...categories, ...itemsByCategory.keys()]);
  const sortedCategories = Array.from(allCategories);

  for (const category of sortedCategories) {
    const categoryItems = itemsByCategory.get(category);
    if (!categoryItems || categoryItems.length === 0) continue;

    // Category header
    scrollContent.push({
      type: 'text',
      id: `cat-header-${category}`,
      content: capitalizeFirst(category),
      style: {
        color: '#fbbf24',
        fontSize: '12px',
        fontWeight: 'bold',
        marginTop: scrollContent.length > 0 ? '12px' : '0',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      },
    } as DisplayElement);

    // Items in this category
    for (const entry of categoryItems) {
      if (entry.type === 'stock') {
        const item = entry.item;
        const quantityInCart = merchant.getQuantityInCart(player, item.itemPath);
        const inCart = quantityInCart > 0;
        const price = merchant.getSellPrice(item.itemPath, player);
        const basePrice = merchant.getBaseSellPrice(item.itemPath);
        const canAfford = player.gold >= price || state.itemsToSell.length > 0;

        const itemCard = buildItemCard(
          item.itemPath,
          item.name,
          price,
          basePrice,
          inCart,
          canAfford,
          true, // inStock
          item.stock,
          quantityInCart
        );
        scrollContent.push(itemCard);
      } else {
        // Sold item
        const item = entry.item;
        const inCart = soldInCart.has(item.objectId);
        const canAfford = player.gold >= item.sellPrice || state.itemsToSell.length > 0;

        const itemCard = buildSoldItemCard(
          item.objectId,
          item.name,
          item.sellPrice,
          inCart,
          canAfford,
          merchant
        );
        scrollContent.push(itemCard);
      }
    }
  }

  if (scrollContent.length === 0) {
    children.push({
      type: 'text',
      id: 'no-wares',
      content: 'No items for sale.',
      style: { color: '#666', fontStyle: 'italic', padding: '20px' },
    } as DisplayElement);
  } else {
    children.push({
      type: 'vertical',
      gap: '6px',
      style: { overflowY: 'auto', flex: '1', maxHeight: '350px' },
      children: scrollContent,
    });
  }

  return {
    type: 'vertical',
    style: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
      minWidth: '200px',
    },
    children,
  };
}

/**
 * Build the transaction ledger panel (center).
 */
function buildLedgerPanel(
  state: TransactionState,
  playerGold: number,
  merchant: ShopMerchant
): LayoutContainer {
  const ledger = merchant.calculateLedger(state, playerGold);
  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'ledger-heading',
      content: 'Transaction Ledger',
      level: 4,
      style: { color: '#a78bfa', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  // Buying section
  children.push({
    type: 'text',
    id: 'buying-label',
    content: 'BUYING:',
    style: { color: '#f87171', fontSize: '12px', fontWeight: 'bold', marginTop: '8px' },
  } as DisplayElement);

  if (state.itemsToBuy.length === 0) {
    children.push({
      type: 'text',
      id: 'no-buying',
      content: '(none)',
      style: { color: '#666', fontSize: '12px', fontStyle: 'italic', marginLeft: '8px' },
    } as DisplayElement);
  } else {
    for (const entry of state.itemsToBuy) {
      children.push(buildLedgerEntry(entry, 'buy'));
    }
  }

  // Selling section
  children.push({
    type: 'text',
    id: 'selling-label',
    content: 'SELLING:',
    style: { color: '#4ade80', fontSize: '12px', fontWeight: 'bold', marginTop: '12px' },
  } as DisplayElement);

  if (state.itemsToSell.length === 0) {
    children.push({
      type: 'text',
      id: 'no-selling',
      content: '(none)',
      style: { color: '#666', fontSize: '12px', fontStyle: 'italic', marginLeft: '8px' },
    } as DisplayElement);
  } else {
    for (const entry of state.itemsToSell) {
      children.push(buildLedgerEntry(entry, 'sell'));
    }
  }

  // Divider
  children.push({
    type: 'divider',
    id: 'ledger-divider',
    style: { margin: '12px 0' },
  } as DisplayElement);

  // Totals
  children.push({
    type: 'horizontal',
    gap: '8px',
    style: { justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: 'debits-label',
        content: 'Debits:',
        style: { color: '#888', fontSize: '13px' },
      } as DisplayElement,
      {
        type: 'text',
        id: 'debits-value',
        content: `-${ledger.debits}g`,
        style: { color: '#f87171', fontSize: '13px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  });

  children.push({
    type: 'horizontal',
    gap: '8px',
    style: { justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: 'credits-label',
        content: 'Credits:',
        style: { color: '#888', fontSize: '13px' },
      } as DisplayElement,
      {
        type: 'text',
        id: 'credits-value',
        content: `+${ledger.credits}g`,
        style: { color: '#4ade80', fontSize: '13px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  });

  // Net amount
  const netColor = ledger.netAmount >= 0 ? '#4ade80' : '#f87171';
  const netPrefix = ledger.netAmount >= 0 ? '+' : '';

  children.push({
    type: 'divider',
    id: 'net-divider',
    style: { margin: '8px 0' },
  } as DisplayElement);

  children.push({
    type: 'horizontal',
    gap: '8px',
    style: { justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: 'net-label',
        content: 'NET:',
        style: { color: '#ddd', fontSize: '14px', fontWeight: 'bold' },
      } as DisplayElement,
      {
        type: 'text',
        id: 'net-value',
        content: `${netPrefix}${ledger.netAmount}g`,
        style: { color: netColor, fontSize: '14px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  });

  // Warning if cannot finalize
  if (!ledger.canFinalize && ledger.reason) {
    children.push({
      type: 'text',
      id: 'warning',
      content: ledger.reason,
      style: {
        color: '#f87171',
        fontSize: '12px',
        marginTop: '8px',
        padding: '4px',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderRadius: '4px',
      },
    } as DisplayElement);
  }

  return {
    type: 'vertical',
    style: {
      width: '200px',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
    },
    children,
  };
}

/**
 * Build a ledger entry row.
 */
function buildLedgerEntry(
  entry: BuyEntry | SellEntry,
  type: 'buy' | 'sell'
): LayoutContainer {
  const isBuy = type === 'buy';
  let actionId: string;
  if (isBuy) {
    const buyEntry = entry as BuyEntry;
    // Use different action for sold items vs stock items
    actionId = buyEntry.isSoldItem
      ? `remove-sold-buy-${buyEntry.objectId}`
      : `remove-buy-${buyEntry.itemPath}`;
  } else {
    actionId = `remove-sell-${(entry as SellEntry).itemId}`;
  }

  // Calculate display values for buy entries with quantity
  const quantity = isBuy ? (entry as BuyEntry).quantity || 1 : 1;
  const totalPrice = entry.price * quantity;
  const displayName = quantity > 1
    ? `${truncateText(entry.name, 9)} x${quantity}`
    : truncateText(entry.name, 12);

  return {
    type: 'horizontal',
    gap: '4px',
    style: {
      alignItems: 'center',
      marginLeft: '8px',
      marginTop: '4px',
      flexWrap: 'nowrap',
      display: 'flex',
    },
    children: [
      {
        type: 'button',
        id: actionId,
        name: actionId,
        label: '-',
        action: 'custom' as const,
        customAction: actionId,
        variant: 'ghost',
        style: {
          width: '20px',
          minWidth: '20px',
          height: '20px',
          padding: '0',
          fontSize: '12px',
          flexShrink: 0,
        },
      } as InputElement,
      {
        type: 'text',
        id: `entry-name-${entry.name}`,
        content: displayName,
        style: { color: '#ddd', fontSize: '12px', flex: '1', overflow: 'hidden' },
      } as DisplayElement,
      {
        type: 'text',
        id: `entry-price-${entry.name}`,
        content: isBuy ? `-${totalPrice}g` : `+${entry.price}g`,
        style: {
          color: isBuy ? '#f87171' : '#4ade80',
          fontSize: '12px',
          fontWeight: 'bold',
          flexShrink: 0,
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Build the player inventory panel (right).
 */
function buildInventoryPanel(
  player: ShopPlayer,
  merchant: ShopMerchant,
  state: TransactionState
): LayoutContainer {
  const itemsInSellCart = new Set(state.itemsToSell.map((e) => e.itemId));

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'inventory-heading',
      content: 'Your Items',
      level: 4,
      style: { color: '#fbbf24', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  // Player's sellable items
  const itemCards: Array<LayoutContainer | DisplayElement> = [];
  for (const item of player.inventory) {
    // Skip items already in cart
    const inCart = itemsInSellCart.has(item.objectId);

    // Check if merchant accepts this item
    const accepted = merchant.acceptsItem(item);

    // Check if equipped
    const equipped = isItemEquipped(item);

    const price = accepted ? merchant.getBuyPrice(item, player) : 0;
    const basePrice = accepted ? merchant.getBaseBuyPrice(item) : 0;

    const itemCard = buildPlayerItemCard(
      item,
      price,
      basePrice,
      inCart,
      accepted,
      equipped
    );
    itemCards.push(itemCard);
  }

  if (itemCards.length === 0) {
    children.push({
      type: 'text',
      id: 'no-items',
      content: 'No items in inventory.',
      style: { color: '#666', fontStyle: 'italic', padding: '20px' },
    } as DisplayElement);
  } else {
    children.push({
      type: 'vertical',
      gap: '8px',
      style: { overflowY: 'auto', flex: '1', maxHeight: '350px' },
      children: itemCards,
    });
  }

  return {
    type: 'vertical',
    style: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
      minWidth: '200px',
    },
    children,
  };
}

/**
 * Build an item card for merchant wares.
 */
function buildItemCard(
  itemPath: string,
  itemName: string,
  price: number,
  basePrice: number,
  inCart: boolean,
  canAfford: boolean,
  inStock: boolean,
  stock: number = -1,
  quantityInCart: number = 0
): LayoutContainer {
  const portraitDaemon = getPortraitDaemon();
  const name = itemName || 'Unknown Item';
  // Use fallback for immediate display - real images loaded asynchronously after modal opens
  const portrait = portraitDaemon.getFallbackImage('item');

  const hasQuantityInCart = quantityInCart > 0;
  const canAddMore = stock === -1 || quantityInCart < stock;
  const disabled = !canAfford || !inStock;
  const priceHasBonus = price !== basePrice;

  // Build stock indicator text
  let stockText = '';
  if (stock !== -1) {
    const remaining = stock - quantityInCart;
    stockText = `Stock: ${remaining}`;
  }

  // Build price line with optional stock indicator
  const priceChildren: Array<DisplayElement | LayoutContainer> = priceHasBonus
    ? [
        {
          type: 'text',
          id: `item-base-${itemPath}`,
          content: `${basePrice}g`,
          style: {
            color: '#666',
            fontSize: '12px',
            textDecoration: 'line-through',
          },
        } as DisplayElement,
        {
          type: 'text',
          id: `item-price-${itemPath}`,
          content: `${price}g`,
          style: { color: '#fbbf24', fontSize: '12px', fontWeight: 'bold' },
        } as DisplayElement,
      ]
    : [
        {
          type: 'text',
          id: `item-price-${itemPath}`,
          content: `${price}g`,
          style: { color: '#fbbf24', fontSize: '12px' },
        } as DisplayElement,
      ];

  // Add stock indicator if limited
  if (stockText) {
    priceChildren.push({
      type: 'text',
      id: `item-stock-${itemPath}`,
      content: stockText,
      style: { color: '#888', fontSize: '10px', marginLeft: '8px' },
    } as DisplayElement);
  }

  // Build quantity controls if item is in cart
  const quantityControls: Array<DisplayElement | InputElement | LayoutContainer> = hasQuantityInCart
    ? [
        {
          type: 'button',
          id: `dec-buy-${itemPath}`,
          name: `dec-buy-${itemPath}`,
          label: '-',
          action: 'custom' as const,
          customAction: `dec-buy-${itemPath}`,
          variant: 'ghost',
          style: { width: '24px', height: '24px', padding: '0', fontSize: '14px' },
        } as InputElement,
        {
          type: 'text',
          id: `qty-${itemPath}`,
          content: `${quantityInCart}`,
          style: { color: '#ddd', fontSize: '13px', minWidth: '20px', textAlign: 'center' },
        } as DisplayElement,
        {
          type: 'button',
          id: `inc-buy-${itemPath}`,
          name: `inc-buy-${itemPath}`,
          label: '+',
          action: 'custom' as const,
          customAction: `inc-buy-${itemPath}`,
          variant: 'ghost',
          disabled: !canAddMore || disabled,
          style: { width: '24px', height: '24px', padding: '0', fontSize: '14px' },
        } as InputElement,
      ]
    : [
        {
          type: 'button',
          id: `add-buy-${itemPath}`,
          name: `add-buy-${itemPath}`,
          label: '+',
          action: 'custom' as const,
          customAction: `add-buy-${itemPath}`,
          variant: 'ghost',
          disabled: disabled,
          style: { width: '28px', height: '28px', padding: '0' },
        } as InputElement,
      ];

  return {
    type: 'horizontal',
    gap: '8px',
    style: {
      padding: '8px',
      backgroundColor: hasQuantityInCart ? '#2d3748' : '#252530',
      borderRadius: '4px',
      alignItems: 'center',
      opacity: disabled && !hasQuantityInCart ? '0.5' : '1',
    },
    children: [
      {
        type: 'image',
        id: `item-img-${itemPath}`,
        src: portrait,
        alt: name,
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          objectFit: 'cover',
        },
      } as DisplayElement,
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `item-name-${itemPath}`,
            content: truncateText(name, 20),
            style: { color: '#ddd', fontSize: '13px' },
          } as DisplayElement,
          {
            type: 'horizontal',
            gap: '4px',
            style: { alignItems: 'center' },
            children: priceChildren,
          },
        ],
      },
      {
        type: 'horizontal',
        gap: '2px',
        style: { alignItems: 'center' },
        children: quantityControls,
      },
    ],
  };
}

/**
 * Build an item card for a sold item (player previously sold to merchant).
 */
function buildSoldItemCard(
  objectId: string,
  itemName: string,
  price: number,
  inCart: boolean,
  canAfford: boolean,
  _merchant: ShopMerchant
): LayoutContainer {
  const portraitDaemon = getPortraitDaemon();
  const name = itemName || 'Unknown Item';
  // Use fallback for immediate display - real images loaded asynchronously after modal opens
  const portrait = portraitDaemon.getFallbackImage('item');

  const disabled = inCart || !canAfford;

  return {
    type: 'horizontal',
    gap: '8px',
    style: {
      padding: '8px',
      backgroundColor: inCart ? '#2d3748' : '#252530',
      borderRadius: '4px',
      alignItems: 'center',
      opacity: disabled && !inCart ? '0.5' : '1',
      border: '1px dashed #4a5568', // Dashed border to indicate "used" item
    },
    children: [
      {
        type: 'image',
        id: `sold-img-${objectId}`,
        src: portrait,
        alt: name,
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          objectFit: 'cover',
        },
      } as DisplayElement,
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `sold-name-${objectId}`,
            content: truncateText(name, 20),
            style: { color: '#ddd', fontSize: '13px' },
          } as DisplayElement,
          {
            type: 'horizontal',
            gap: '4px',
            children: [
              {
                type: 'text',
                id: `sold-price-${objectId}`,
                content: `${price}g`,
                style: { color: '#fbbf24', fontSize: '12px' },
              } as DisplayElement,
              {
                type: 'text',
                id: `sold-tag-${objectId}`,
                content: '(used)',
                style: { color: '#888', fontSize: '10px', fontStyle: 'italic' },
              } as DisplayElement,
            ],
          },
        ],
      },
      {
        type: 'button',
        id: `add-sold-buy-${objectId}`,
        name: `add-sold-buy-${objectId}`,
        label: inCart ? '...' : '+',
        action: 'custom' as const,
        customAction: `add-sold-buy-${objectId}`,
        variant: 'ghost',
        disabled: disabled,
        style: { width: '28px', height: '28px', padding: '0' },
      } as InputElement,
    ],
  };
}

/**
 * Build an item card for player inventory.
 */
function buildPlayerItemCard(
  item: Item,
  price: number,
  basePrice: number,
  inCart: boolean,
  accepted: boolean,
  equipped: boolean
): LayoutContainer {
  const portraitDaemon = getPortraitDaemon();
  const name = item.shortDesc || item.name || 'Unknown Item';
  // Use fallback for immediate display - real images loaded asynchronously after modal opens
  const portrait = portraitDaemon.getFallbackImage('item');

  const disabled = inCart || !accepted || equipped;
  const priceHasBonus = price !== basePrice && accepted;

  let statusText = '';
  if (!accepted) statusText = '(N/A)';
  else if (equipped) statusText = '(Equipped)';
  else if (inCart) statusText = '(In cart)';

  return {
    type: 'horizontal',
    gap: '8px',
    style: {
      padding: '8px',
      backgroundColor: inCart ? '#2d3748' : '#252530',
      borderRadius: '4px',
      alignItems: 'center',
      opacity: disabled && !inCart ? '0.5' : '1',
    },
    children: [
      {
        type: 'image',
        id: `inv-img-${item.objectId}`,
        src: portrait,
        alt: name,
        style: {
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          objectFit: 'cover',
        },
      } as DisplayElement,
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `inv-name-${item.objectId}`,
            content: truncateText(name, 18),
            style: { color: '#ddd', fontSize: '13px' },
          } as DisplayElement,
          statusText
            ? ({
                type: 'text',
                id: `inv-status-${item.objectId}`,
                content: statusText,
                style: { color: '#888', fontSize: '11px', fontStyle: 'italic' },
              } as DisplayElement)
            : ({
                type: 'horizontal',
                gap: '4px',
                children: priceHasBonus
                  ? [
                      {
                        type: 'text',
                        id: `inv-base-${item.objectId}`,
                        content: `${basePrice}g`,
                        style: {
                          color: '#666',
                          fontSize: '12px',
                          textDecoration: 'line-through',
                        },
                      } as DisplayElement,
                      {
                        type: 'text',
                        id: `inv-price-${item.objectId}`,
                        content: `${price}g`,
                        style: { color: '#4ade80', fontSize: '12px', fontWeight: 'bold' },
                      } as DisplayElement,
                    ]
                  : [
                      {
                        type: 'text',
                        id: `inv-price-${item.objectId}`,
                        content: `${price}g`,
                        style: { color: '#4ade80', fontSize: '12px' },
                      } as DisplayElement,
                    ],
              } as LayoutContainer),
        ],
      },
      {
        type: 'button',
        id: `add-sell-${item.objectId}`,
        name: `add-sell-${item.objectId}`,
        label: inCart ? '...' : '+',
        action: 'custom' as const,
        customAction: `add-sell-${item.objectId}`,
        variant: 'ghost',
        disabled: disabled,
        style: { width: '28px', height: '28px', padding: '0' },
      } as InputElement,
    ],
  };
}

/**
 * Build the footer buttons.
 */
function buildButtons(state: TransactionState, ledger: LedgerSummary): ModalButton[] {
  const hasItems = state.itemsToBuy.length > 0 || state.itemsToSell.length > 0;

  return [
    {
      id: 'clear',
      label: 'Clear Cart',
      action: 'custom',
      customAction: 'clear-cart',
      variant: 'secondary',
      disabled: !hasItems,
    },
    {
      id: 'finalize',
      label: 'Finalize Transaction',
      action: 'custom',
      customAction: 'finalize',
      variant: 'primary',
      disabled: !hasItems || !ledger.canFinalize,
    },
    {
      id: 'close',
      label: 'Leave Shop',
      action: 'cancel',
      variant: 'ghost',
    },
  ];
}

/**
 * Handle GUI responses from the client.
 */
async function handleShopResponse(
  player: ShopPlayer,
  merchant: ShopMerchant,
  msg: GUIClientMessage
): Promise<void> {
  if (msg.modalId !== MODAL_ID) return;

  if (msg.action === 'closed') {
    activeMerchants.delete(player.objectId);
    player.onGUIResponse = undefined;
    return;
  }

  if (msg.action === 'button') {
    const customAction = msg.customAction || msg.buttonId;

    // Handle add to buy cart (stock items)
    if (customAction.startsWith('add-buy-')) {
      const itemPath = customAction.slice('add-buy-'.length);
      merchant.addToBuyCart(player, itemPath);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle increment quantity in buy cart
    if (customAction.startsWith('inc-buy-')) {
      const itemPath = customAction.slice('inc-buy-'.length);
      merchant.addToBuyCart(player, itemPath, 1);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle decrement quantity in buy cart
    if (customAction.startsWith('dec-buy-')) {
      const itemPath = customAction.slice('dec-buy-'.length);
      const currentQty = merchant.getQuantityInCart(player, itemPath);
      if (currentQty > 1) {
        merchant.setCartQuantity(player, itemPath, currentQty - 1);
      } else {
        merchant.removeFromBuyCart(player, itemPath);
      }
      await updateShopModal(player, merchant);
      return;
    }

    // Handle add sold item to buy cart
    if (customAction.startsWith('add-sold-buy-')) {
      const objectId = customAction.slice('add-sold-buy-'.length);
      merchant.addSoldItemToBuyCart(player, objectId);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle add to sell cart
    if (customAction.startsWith('add-sell-')) {
      const itemId = customAction.slice('add-sell-'.length);
      merchant.addToSellCart(player, itemId);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle remove from buy cart (stock items)
    if (customAction.startsWith('remove-buy-')) {
      const itemPath = customAction.slice('remove-buy-'.length);
      merchant.removeFromBuyCart(player, itemPath);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle remove sold item from buy cart
    if (customAction.startsWith('remove-sold-buy-')) {
      const objectId = customAction.slice('remove-sold-buy-'.length);
      merchant.removeFromBuyCart(player, objectId);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle remove from sell cart
    if (customAction.startsWith('remove-sell-')) {
      const itemId = customAction.slice('remove-sell-'.length);
      merchant.removeFromSellCart(player, itemId);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle clear cart
    if (customAction === 'clear-cart') {
      merchant.clearCart(player);
      await updateShopModal(player, merchant);
      return;
    }

    // Handle finalize
    if (customAction === 'finalize') {
      const result = await merchant.finalizeTransaction(player);
      if (result.success) {
        // Show success and refresh
        if ('receive' in player) {
          (player as ShopPlayer & { receive: (msg: string) => void }).receive(
            `{green}${result.message}{/}\n`
          );
        }
        await updateShopModal(player, merchant);
      } else {
        // Show error
        if ('receive' in player) {
          (player as ShopPlayer & { receive: (msg: string) => void }).receive(
            `{red}${result.message}{/}\n`
          );
        }
      }
      return;
    }
  }
}

/**
 * Check if an item is equipped.
 */
function isItemEquipped(item: Item): boolean {
  if ('isWielded' in item && (item as Item & { isWielded: boolean }).isWielded) {
    return true;
  }
  if ('isWorn' in item && (item as Item & { isWorn: boolean }).isWorn) {
    return true;
  }
  return false;
}

/**
 * Capitalize the first letter.
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis.
 */
function truncateText(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '...';
}
