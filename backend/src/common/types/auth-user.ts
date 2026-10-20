import { UserRole } from '@prisma/client';

/** Shape of `request.user` produced by JwtStrategy.validate(). */
export interface AuthUser {
  id: string;
  email?: string | null;
  role: UserRole;
  status?: string;
  /** ConsumerProfile.id or BusinessOwnerProfile.id (undefined for SUPER_ADMIN). */
  profileId?: string;
  displayName?: string;
  /** Password-less guest-checkout account (see AllowGuest). */
  isGuest?: boolean;
}
