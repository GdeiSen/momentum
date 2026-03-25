import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsService } from './sessions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, RefreshTokenPayload, AuthenticatedUser } from '../../common/types';

/**
 * Authentication service handling user registration, login, and token management.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * Registers a new user in the system.
   *
   * @param registerDto - User registration data (email, password, nickname).
   * @returns Created user data with tokens.
   * @throws ConflictException if email or nickname already exists.
   */
  async register(registerDto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const { email, password, nickname } = registerDto;

    // Check for existing user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { nickname }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictException('User with this email already exists');
      }
      throw new ConflictException('User with this nickname already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        nickname,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    // Generate tokens and create session
    const tokens = await this.generateTokensAndCreateSession(
      user.id,
      user.email,
      user.nickname,
      userAgent,
      ipAddress,
    );

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Authenticates a user with email and password.
   *
   * @param loginDto - Login credentials.
   * @returns User data with tokens.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens and create session
    const tokens = await this.generateTokensAndCreateSession(
      user.id,
      user.email,
      user.nickname,
      userAgent,
      ipAddress,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  /**
   * Refreshes access token using a valid refresh token.
   *
   * @param refreshToken - The refresh token.
   * @returns New access and refresh tokens.
   * @throws UnauthorizedException if refresh token is invalid or expired.
   */
  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    // Verify refresh token
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find session
    const session = await this.sessionsService.findByIdAndToken(payload.sessionId, refreshToken);
    if (!session) {
      throw new UnauthorizedException('Session not found or token mismatch');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.sessionsService.delete(session.id);
      throw new UnauthorizedException('Session expired');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete old session and create new one (rotate refresh token)
    await this.sessionsService.delete(session.id);

    const tokens = await this.generateTokensAndCreateSession(
      user.id,
      user.email,
      user.nickname,
      userAgent,
      ipAddress,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
      ...tokens,
    };
  }

  /**
   * Logs out user by deleting the session.
   *
   * @param refreshToken - The refresh token to invalidate.
   */
  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      await this.sessionsService.deleteBySessionId(payload.sessionId);
    } catch {
      // Token might be invalid, but we still want to "logout"
      // Just ignore the error
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Logs out user from all devices by deleting all sessions.
   *
   * @param userId - The user ID.
   */
  async logoutAll(userId: string) {
    await this.sessionsService.deleteAllByUserId(userId);
    return { message: 'Logged out from all devices' };
  }

  /**
   * Gets all active sessions for a user.
   *
   * @param userId - The user ID.
   * @returns List of active sessions.
   */
  async getSessions(userId: string) {
    return this.sessionsService.findAllByUserId(userId);
  }

  /**
   * Revokes a specific session.
   *
   * @param userId - The user ID.
   * @param sessionId - The session ID to revoke.
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionsService.findById(sessionId);

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.sessionsService.delete(sessionId);
    return { message: 'Session revoked successfully' };
  }

  /**
   * Validates user for JWT strategy.
   *
   * @param payload - JWT payload.
   * @returns Authenticated user data.
   */
  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, nickname: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generates access and refresh tokens and creates a session.
   */
  private async generateTokensAndCreateSession(
    userId: string,
    email: string,
    nickname: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // Create session first to get session ID
    const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    const expiresAt = this.calculateExpiration(refreshExpiration);

    const session = await this.sessionsService.create({
      userId,
      userAgent,
      ipAddress,
      expiresAt,
      refreshToken: 'temp', // Will be updated
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(userId, email, nickname);
    const refreshToken = this.generateRefreshToken(userId, session.id);

    // Update session with actual refresh token
    await this.sessionsService.updateRefreshToken(session.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    };
  }

  /**
   * Generates an access token.
   */
  private generateAccessToken(userId: string, email: string, nickname: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      nickname,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Generates a refresh token.
   */
  private generateRefreshToken(userId: string, sessionId: string): string {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  /**
   * Calculates expiration date from duration string.
   */
  private calculateExpiration(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}

