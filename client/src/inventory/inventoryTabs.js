export const INVENTORY_GROUPS = [
  {
    label: 'Inventory',
    tabs: [
      { id: 'products', label: 'Products', icon: '📦', permission: 'products.view' },
      { id: 'stock', label: 'Stock', icon: '📊', permission: 'stock.view' },
      { id: 'locations', label: 'Locations', icon: '🏭', permission: 'locations.view' },
      { id: 'shipment-vendors', label: 'Shipment Vendors', icon: '🚚', permission: 'shipmentVendors.view' },
    ],
  },
];

export const INVENTORY_TABS = INVENTORY_GROUPS.flatMap((group) =>
  group.tabs.map((tab) => ({ ...tab, group: group.label }))
);

export const INVENTORY_TAB_IDS = INVENTORY_TABS.map((tab) => tab.id);

export function isInventoryTab(tabId) {
  return INVENTORY_TAB_IDS.includes(tabId);
}

export function resolveInventorySubTab(tabId) {
  if (tabId === 'inventory') return 'stock';
  if (tabId.startsWith('inventory:')) return tabId.slice('inventory:'.length);
  return isInventoryTab(tabId) ? tabId : 'stock';
}
