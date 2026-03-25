import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which team roles are allowed to access a route.
 *
 * @example
 * ```typescript
 * @Roles(TeamRole.ADMIN, TeamRole.OWNER)
 * @UseGuards(JwtAuthGuard, TeamRolesGuard)
 * @Delete(':id')
 * deleteTeam(@Param('id') id: string) {
 *   // Only admins and owners can delete
 * }
 * ```
 */
export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);

