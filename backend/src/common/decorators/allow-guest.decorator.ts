import { SetMetadata } from '@nestjs/common';

export const ALLOW_GUEST_KEY = 'allowGuest';

/**
 * Guest-checkout accounts (password-less shadow users) are denied on every
 * JwtAuthGuard route by default. Only routes marked with this decorator
 * (cart, order, payment and the guest/auth endpoints) accept them.
 */
export const AllowGuest = () => SetMetadata(ALLOW_GUEST_KEY, true);
