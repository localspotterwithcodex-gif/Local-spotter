import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty()
  data: {
    users: { total: number; consumers: number; businessOwners: number };
    businesses: { total: number; active: number; pending: number; suspended: number };
    subscriptions: { active: number };
    orders: { total: number };
    products: { total: number };
    workshops: { total: number };
    bookings: { total: number };
    reviews: { total: number; pending: number };
    revenue: number;
    pendingPayouts: number;
    reportedContent: number;
    failedWebhooks: number;
  };
}
