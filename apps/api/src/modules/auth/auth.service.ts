import bcrypt from 'bcryptjs';
import { PrismaClient } from '@scholaris/database';
import { JWT } from '@fastify/jwt';
import {
  AuthTokens,
  JWTPayload,
  UserDTO,
  UserProfileDTO,
} from '@scholaris/types';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@scholaris/shared';
import { RegisterInput, LoginInput } from '@scholaris/validation';
import { env } from '../../config/env.js';

export interface AuthResult {
  user: UserDTO;
  profile: UserProfileDTO;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JWT
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const fullName = `${input.firstName} ${input.lastName}`.trim();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: 'STUDENT',
          isEmailVerified: false,
        },
      });

      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          fullName,
          nationality: 'Unknown',
          residenceCountry: 'Unknown',
          city: 'Unknown',
        },
      });

      return { user, profile };
    });

    const tokens = this.generateTokens({
      sub: created.user.id,
      email: created.user.email,
      role: created.user.role,
    });

    return {
      user: this.mapUserToDTO(created.user),
      profile: this.mapProfileToDTO(created.profile),
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Fallback if profile wasn't created
    let profile = user.profile;
    if (!profile) {
      profile = await this.prisma.userProfile.create({
        data: {
          userId: user.id,
          firstName: 'Student',
          lastName: 'User',
          fullName: 'Student User',
          nationality: 'Unknown',
          residenceCountry: 'Unknown',
          city: 'Unknown',
        },
      });
    }

    return {
      user: this.mapUserToDTO(user),
      profile: this.mapProfileToDTO(profile),
      tokens,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const decoded = this.jwt.verify<JWTPayload>(token, {
        key: env.JWT_REFRESH_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user) {
        throw new UnauthorizedError('User account not found');
      }

      const payload: JWTPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
      return { accessToken, expiresIn: 900 };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string): Promise<{ user: UserDTO; profile: UserProfileDTO | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      user: this.mapUserToDTO(user),
      profile: user.profile ? this.mapProfileToDTO(user.profile) : null,
    };
  }

  private generateTokens(payload: JWTPayload): AuthTokens {
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, {
      key: env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private mapUserToDTO(user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserDTO {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserDTO['role'],
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapProfileToDTO(profile: {
    id: string;
    userId: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    fullName: string;
    dateOfBirth: Date | null;
    gender: string | null;
    nationality: string;
    residenceCountry: string;
    city: string;
    address: string | null;
    phone: string | null;
    altEmail: string | null;
    passportNumberEncrypted: string | null;
    familyIncomeTier: string | null;
    financialStatement: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserProfileDTO {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
      gender: profile.gender as UserProfileDTO['gender'],
      nationality: profile.nationality,
      residenceCountry: profile.residenceCountry,
      city: profile.city,
      address: profile.address,
      phone: profile.phone,
      altEmail: profile.altEmail,
      passportNumberEncrypted: profile.passportNumberEncrypted,
      familyIncomeTier: profile.familyIncomeTier,
      financialStatement: profile.financialStatement,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
