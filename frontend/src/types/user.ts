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
