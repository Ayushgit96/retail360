const Role = require('../models/Role');
const Permission = require('../models/Permission');

const ROLE_DEFINITIONS = [
  {
    name: 'Admin',
    code: 'admin',
    description: 'Full system administrator',
    permissionCodes: ['admin.all'],
  },
  {
    name: 'HR',
    code: 'hr',
    description: 'Human resources — user and employee access',
    permissionCodes: [
      'users.view', 'users.create', 'users.update', 'users.delete',
      'roles.view', 'groups.view', 'permissions.view',
      'reports.view',
    ],
  },
  {
    name: 'Accounts',
    code: 'accounts',
    description: 'Finance and purchasing — sales, purchases, pricing',
    permissionModules: ['purchases', 'purchaseOrders', 'prices', 'sales', 'reports', 'suppliers'],
  },
  {
    name: 'Warehouse',
    code: 'warehouse',
    description: 'Inventory and logistics — stock, locations, shipments',
    permissionModules: ['stock', 'locations', 'shipments', 'shippingCharges', 'shipmentVendors', 'products'],
  },
];

async function resolvePermissionIds(def, allPermissions) {
  const ids = new Set();

  (def.permissionCodes || []).forEach((code) => {
    const perm = allPermissions.find((p) => p.code === code);
    if (perm) ids.add(String(perm._id));
  });

  (def.permissionModules || []).forEach((moduleName) => {
    allPermissions
      .filter((p) => p.module === moduleName)
      .forEach((p) => ids.add(String(p._id)));
  });

  return Array.from(ids);
}

async function seedRoles() {
  try {
    const allPermissions = await Permission.find().lean();
    let created = 0;
    let updated = 0;

    for (const def of ROLE_DEFINITIONS) {
      const permissionIds = await resolvePermissionIds(def, allPermissions);
      const existing = await Role.findOne({ code: def.code });

      if (!existing) {
        await Role.create({
          name: def.name,
          code: def.code,
          description: def.description,
          permissions: permissionIds,
        });
        created++;
        continue;
      }

      const needsUpdate =
        existing.name !== def.name ||
        existing.description !== def.description ||
        JSON.stringify(existing.permissions.map(String).sort()) !== JSON.stringify(permissionIds.sort());

      if (needsUpdate) {
        existing.name = def.name;
        existing.description = def.description;
        existing.permissions = permissionIds;
        await existing.save();
        updated++;
      }
    }

    return { created, updated, total: ROLE_DEFINITIONS.length };
  } catch (error) {
    console.error('seedRoles error:', error.message);
    throw error;
  }
}

module.exports = { seedRoles, ROLE_DEFINITIONS };
