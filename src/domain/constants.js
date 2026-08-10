export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const UNIT_AVAILABILITY = Object.freeze({
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
});

export const UNIT_CONDITIONS = Object.freeze({
  GOOD: 'good',
  MINOR_DAMAGE: 'minor_damage',
  DAMAGED: 'damaged',
});

export const LOAN_ITEM_STATUS = Object.freeze({
  BORROWED: 'borrowed',
  RETURNED: 'returned',
});

export const MAX_ACTIVE_UNITS = 2;
export const MAX_LOAN_DAYS = 5;
