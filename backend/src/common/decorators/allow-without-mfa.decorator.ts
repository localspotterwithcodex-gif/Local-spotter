import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_MFA_KEY = 'allowWithoutMfa';

/**
 * SUPER_ADMIN sessions are refused on every JwtAuthGuard route unless they were
 * established with the second factor. Only the MFA enrolment routes and /auth/me
 * (so the app can show the enrolment screen) are marked with this decorator.
 */
export const AllowWithoutMfa = () => SetMetadata(ALLOW_WITHOUT_MFA_KEY, true);
