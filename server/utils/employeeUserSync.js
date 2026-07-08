const User = require('../models/User');
const Role = require('../models/Role');
const Employee = require('../hr/models/Employee');
const {
  findUserForEmployee,
  employeeDisplayName,
  escapeRegex,
} = require('./userEmployeeLink');

function sanitizeUsername(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

function buildDefaultPassword(employee) {
  return `${String(employee.employeeId || 'employee').toLowerCase()}@123`;
}

function employeeIsActive(employee) {
  return ['Active', 'On Leave'].includes(employee.status);
}

async function getEmployeeRoleId() {
  const role = await Role.findOne({ code: 'employee' }).select('_id').lean();
  return role?._id || null;
}

async function isUsernameAvailable(username, excludeUserId) {
  const query = {
    username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') },
  };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.findOne(query).select('_id').lean();
  return !existing;
}

async function isEmailAvailable(email, excludeUserId) {
  const query = { email: String(email || '').toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.findOne(query).select('_id').lean();
  return !existing;
}

async function buildUniqueUsername(employee, excludeUserId) {
  const fullName = employeeDisplayName(employee);
  const options = [
    sanitizeUsername(employee.firstName),
    sanitizeUsername(fullName),
    sanitizeUsername(employee.employeeId),
    `${sanitizeUsername(employee.firstName)}.${sanitizeUsername(employee.employeeId)}`,
  ].filter(Boolean);

  for (const option of options) {
    if (await isUsernameAvailable(option, excludeUserId)) {
      return option;
    }
  }

  return String(employee.employeeId || `emp${Date.now()}`).toLowerCase();
}

async function findLinkedUser(employee) {
  let user = await User.findOne({ email: employee.email.toLowerCase() });
  if (user) {
    return user;
  }

  const linked = await findUserForEmployee(employee);
  if (!linked?._id) {
    return null;
  }

  return User.findById(linked._id);
}

async function ensureUserForEmployee(employeeInput) {
  const employee = employeeInput?.toObject ? employeeInput.toObject() : employeeInput;
  if (!employee?.email || !employee?.firstName || !employee?.employeeId) {
    return { skipped: true, reason: 'Employee is missing required fields' };
  }

  const employeeRoleId = await getEmployeeRoleId();
  const isActive = employeeIsActive(employee);
  let user = await findLinkedUser(employee);
  let created = false;
  let defaultPassword = null;

  if (!user) {
    const username = await buildUniqueUsername(employee);
    defaultPassword = buildDefaultPassword(employee);
    user = new User({
      username,
      email: employee.email.toLowerCase(),
      password: defaultPassword,
      roles: employeeRoleId ? [employeeRoleId] : [],
      groups: [],
      isActive,
    });
    await user.save();
    created = true;
  } else {
    if (!(await isEmailAvailable(employee.email, user._id))) {
      return {
        skipped: true,
        reason: `Email ${employee.email} is already used by another user`,
      };
    }

    user.email = employee.email.toLowerCase();
    user.isActive = isActive;

    if (employeeRoleId) {
      const roleIds = (user.roles || []).map((roleId) => String(roleId));
      if (!roleIds.includes(String(employeeRoleId))) {
        user.roles = [...(user.roles || []), employeeRoleId];
      }
    }

    await user.save();
  }

  return {
    skipped: false,
    created,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
    },
    defaultPassword: created ? defaultPassword : undefined,
  };
}

async function deactivateUserForEmployee(employeeInput) {
  const employee = employeeInput?.toObject ? employeeInput.toObject() : employeeInput;
  const user = await findLinkedUser(employee);
  if (!user) {
    return { updated: false };
  }

  user.isActive = false;
  await user.save();
  return { updated: true, userId: user._id };
}

async function syncAllEmployeeUsers() {
  const employees = await Employee.find().lean();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const employee of employees) {
    try {
      const result = await ensureUserForEmployee(employee);
      if (result.skipped) {
        skipped += 1;
      } else if (result.created) {
        created += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      skipped += 1;
      console.warn(`Employee user sync failed for ${employee.employeeId}:`, error.message);
    }
  }

  return {
    total: employees.length,
    created,
    updated,
    skipped,
  };
}

module.exports = {
  buildDefaultPassword,
  ensureUserForEmployee,
  deactivateUserForEmployee,
  syncAllEmployeeUsers,
};
