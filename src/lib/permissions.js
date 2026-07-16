import { roles } from './auth'

export const permissions = {
  ADMIN_ACCESS: 'admin.access',
  MATCH_CAPTURE: 'match.capture',
  MATCH_REVIEW: 'match.review',
  MATCH_OFFICIALIZE: 'match.officialize',
  TEAMS_MANAGE: 'teams.manage',
  PLAYERS_MANAGE: 'players.manage',
  DISCIPLINE_MANAGE: 'discipline.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_READ: 'audit.read',
}

const rolePermissions = {
  [roles.superadmin]: Object.values(permissions),
  [roles.admin]: Object.values(permissions),
  [roles.leaguePresident]: Object.values(permissions).filter((permission) => permission !== permissions.SETTINGS_MANAGE),
  [roles.sportsCoordinator]: [
    permissions.ADMIN_ACCESS,
    permissions.MATCH_CAPTURE,
    permissions.MATCH_REVIEW,
    permissions.MATCH_OFFICIALIZE,
    permissions.TEAMS_MANAGE,
    permissions.PLAYERS_MANAGE,
    permissions.DISCIPLINE_MANAGE,
    permissions.AUDIT_READ,
  ],
  [roles.divisionAdmin]: [
    permissions.ADMIN_ACCESS,
    permissions.MATCH_CAPTURE,
    permissions.MATCH_REVIEW,
    permissions.MATCH_OFFICIALIZE,
    permissions.TEAMS_MANAGE,
    permissions.PLAYERS_MANAGE,
    permissions.DISCIPLINE_MANAGE,
  ],
  [roles.referee]: [
    permissions.ADMIN_ACCESS,
    permissions.MATCH_CAPTURE,
  ],
  [roles.discipline]: [
    permissions.ADMIN_ACCESS,
    permissions.DISCIPLINE_MANAGE,
  ],
  [roles.treasury]: [
    permissions.ADMIN_ACCESS,
  ],
  [roles.media]: [
    permissions.ADMIN_ACCESS,
  ],
  [roles.captain]: [],
  [roles.player]: [],
  [roles.viewer]: [],
}

export function hasPermission(role, permission) {
  return Boolean(rolePermissions[role]?.includes(permission))
}

export function hasAnyPermission(role, list = []) {
  return list.some((permission) => hasPermission(role, permission))
}
