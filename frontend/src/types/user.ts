export type UserRole = "PUBLIC" | "CONSUMER" | "BUSINESS_OWNER" | "SUPER_ADMIN";

export interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  onboardingComplete?: boolean;
  /** Guest-checkout account: no password, limited to cart, orders and payments. */
  isGuest?: boolean;
  /** Admin signed in without a second factor yet: the admin app shows MFA enrolment. */
  mfaSetupRequired?: boolean;
}

export interface ConsumerProfile {
  id: string;
  userId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  followingBusinessIds: string[];
}

export interface BusinessOwnerProfile {
  id: string;
  userId: string;
  businessIds: string[];
  kvkNumber: string;
  phone: string;
}
