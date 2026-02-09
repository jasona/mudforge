/**
 * Permission levels shared across mudlib systems.
 */
export const PermissionLevel = {
  Player: 0,
  Builder: 1,
  SeniorBuilder: 2,
  Administrator: 3,
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];
