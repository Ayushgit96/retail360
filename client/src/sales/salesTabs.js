export const SALES_GROUPS = [
  {
    label: 'Sales',
    tabs: [
      { id: 'sales-dashboard', label: 'Sales Dashboard', icon: '📊', permission: 'sales.view' },
      { id: 'sales', label: 'Sales Report', icon: '📋', permission: 'sales.view' },
      { id: 'shipments', label: 'Shipments', icon: '📦', permission: 'shipments.view' },
      { id: 'shipping-charges', label: 'Shipping Charges', icon: '💳', permission: 'shippingCharges.view' },
    ],
  },
];

export const SALES_TABS = SALES_GROUPS.flatMap((group) =>
  group.tabs.map((tab) => ({ ...tab, group: group.label }))
);

export const SALES_TAB_IDS = SALES_TABS.map((tab) => tab.id);

export function isSalesModuleTab(tabId) {
  return SALES_TAB_IDS.includes(tabId);
}

export function resolveSalesSubTab(tabId) {
  if (tabId === 'sales-module') return 'sales';
  if (tabId.startsWith('sales-module:')) return tabId.slice('sales-module:'.length);
  return isSalesModuleTab(tabId) ? tabId : 'sales';
}
