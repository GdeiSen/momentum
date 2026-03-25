import { TeamRole } from '@prisma/client';

/**
 * JWT Payload structure for access tokens.
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  nickname: string;
}

/**
 * JWT Payload structure for refresh tokens.
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  sessionId: string;
}

/**
 * Authenticated user data attached to request.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  nickname: string;
}

/**
 * Extended request with authenticated user.
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

/**
 * Team member context for authorization.
 */
export interface TeamMemberContext {
  userId: string;
  teamId: string;
  role: TeamRole;
}

/**
 * Pagination parameters.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

