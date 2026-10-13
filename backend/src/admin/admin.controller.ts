import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateBusinessStatusDto } from '../businesses/dto/update-business-status.dto';
import { AdminProductQueryDto, ModerateProductDto, AdminReviewQueryDto, ModerateReviewDto, ModerateCommentDto, ResolveReportDto } from './dto/moderation.dto';
import { AdminOrderQueryDto, AdminPaymentQueryDto, AdminSubscriptionQueryDto, UpdateOrderStatusDto } from './dto/admin-entity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Platform dashboard metrics.' })
  async getDashboard(@Query() query: { startDate?: string; endDate?: string }) {
    return this.adminService.getDashboard(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of users.' })
  async getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'View user details and associated data' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details with orders and businesses.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Suspend or reactivate a user account' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User status updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.status);
  }

  @Get('users/:userId/orders')
  @ApiOperation({ summary: 'View user orders' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'List of user orders.' })
  async getUserOrders(@Param('userId') userId: string) {
    return this.adminService.getUserOrders(userId);
  }

  @Get('users/:userId/businesses')
  @ApiOperation({ summary: 'View user businesses' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'List of user businesses.' })
  async getUserBusinesses(@Param('userId') userId: string) {
    return this.adminService.getUserBusinesses(userId);
  }

  @Get('businesses')
  @ApiOperation({ summary: 'List all businesses with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of businesses.' })
  async getBusinesses(@Query() query: { search?: string; status?: string; categoryId?: string; limit?: string; offset?: string }) {
    return this.adminService.getBusinesses(query);
  }

  @Get('businesses/:businessId')
  @ApiOperation({ summary: 'View business details' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business details with owner, subscription, and counts.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async getBusiness(@Param('businessId') businessId: string) {
    return this.adminService.getBusiness(businessId);
  }

  @Patch('businesses/:businessId/status')
  @ApiOperation({ summary: 'Approve, reject, suspend, or activate a business' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business status updated.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async updateBusinessStatus(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessStatusDto,
  ) {
    return this.adminService.updateBusinessStatus(businessId, dto.status);
  }

  @Get('businesses/:businessId/subscriptions')
  @ApiOperation({ summary: 'View business subscription' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business subscription details.' })
  async getBusinessSubscription(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessSubscription(businessId);
  }

  @Get('businesses/:businessId/products')
  @ApiOperation({ summary: 'View business products' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'List of business products.' })
  async getBusinessProducts(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessProducts(businessId);
  }

  @Get('businesses/:businessId/orders')
  @ApiOperation({ summary: 'View business orders' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'List of business orders.' })
  async getBusinessOrders(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessOrders(businessId);
  }

  @Get('businesses/:businessId/reviews')
  @ApiOperation({ summary: 'View business reviews' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'List of business reviews.' })
  async getBusinessReviews(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessReviews(businessId);
  }

  @Get('businesses/:businessId/payments')
  @ApiOperation({ summary: 'View business payment history' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'List of business payments.' })
  async getBusinessPayments(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessPayments(businessId);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of products.' })
  async getProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.getProducts(query);
  }

  @Patch('products/:productId/moderation')
  @ApiOperation({ summary: 'Disable or restore a product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product moderation updated.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async moderateProduct(
    @Param('productId') productId: string,
    @Body() dto: ModerateProductDto,
  ) {
    return this.adminService.moderateProduct(productId, dto.active);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews.' })
  async getReviews(@Query() query: AdminReviewQueryDto) {
    return this.adminService.getReviews(query);
  }

  @Patch('reviews/:reviewId/moderation')
  @ApiOperation({ summary: 'Hide, remove, or restore a review' })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review moderation updated.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  async moderateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.adminService.moderateReview(reviewId, dto.status);
  }

  @Get('comments')
  @ApiOperation({ summary: 'List all comments' })
  @ApiResponse({ status: 200, description: 'Paginated list of comments.' })
  async getComments(@Query() query: { limit?: string; offset?: string }) {
    return this.adminService.getComments(query);
  }

  @Patch('comments/:commentId/moderation')
  @ApiOperation({ summary: 'Moderate a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment moderation updated.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async moderateComment(
    @Param('commentId') commentId: string,
    @Body() dto: ModerateCommentDto,
  ) {
    return this.adminService.moderateComment(commentId, dto.status);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List reported content' })
  @ApiResponse({ status: 200, description: 'Paginated list of reports.' })
  async getReports(@Query() query: { limit?: string; offset?: string }) {
    return this.adminService.getReports(query);
  }

  @Patch('reports/:reportId')
  @ApiOperation({ summary: 'Resolve a report' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report resolved.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(reportId, dto.status);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders.' })
  async getOrders(@Query() query: AdminOrderQueryDto) {
    return this.adminService.getOrders(query);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'View order details' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details with items and consumer info.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.adminService.getOrder(orderId);
  }

  @Patch('orders/:orderId/status')
  @ApiOperation({ summary: 'Correct order status (requires audit reason)' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order status updated.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(orderId, dto.status, dto.reason);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments.' })
  async getPayments(@Query() query: AdminPaymentQueryDto) {
    return this.adminService.getPayments(query);
  }

@Get('payments/:paymentId')
  @ApiOperation({ summary: 'View payment details' })
  @ApiParam({ name: 'paymentId', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details with provider references.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.adminService.getPayment(paymentId);
  }

  @Get('payment-stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics summary.' })
  async getPaymentStats(@Query() query: { startDate?: string; endDate?: string }) {
    return this.adminService.getPaymentStats(query);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of subscriptions.' })
  async getSubscriptions(@Query() query: AdminSubscriptionQueryDto) {
    return this.adminService.getSubscriptions(query);
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'View subscription details' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription UUID' })
  @ApiResponse({ status: 200, description: 'Subscription details with plan info.' })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.adminService.getSubscription(subscriptionId);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List all payouts with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of payouts.' })
  async getPayouts(@Query() query: { status?: string; businessId?: string; limit?: string; offset?: string }) {
    return this.adminService.getPayouts(query);
  }

  @Get('payouts/:payoutId')
  @ApiOperation({ summary: 'View payout details' })
  @ApiParam({ name: 'payoutId', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Payout details with business and user info.' })
  @ApiResponse({ status: 404, description: 'Payout not found.' })
  async getPayout(@Param('payoutId') payoutId: string) {
    return this.adminService.getPayout(payoutId);
  }

  @Patch('payouts/:payoutId/approve')
  @ApiOperation({ summary: 'Approve a payout' })
  @ApiParam({ name: 'payoutId', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Payout approved.' })
  @ApiResponse({ status: 404, description: 'Payout not found.' })
  async approvePayout(@Param('payoutId') payoutId: string) {
    return this.adminService.approvePayout(payoutId);
  }

  @Patch('payouts/:payoutId/reject')
  @ApiOperation({ summary: 'Reject a payout' })
  @ApiParam({ name: 'payoutId', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Payout rejected.' })
  @ApiResponse({ status: 404, description: 'Payout not found.' })
  async rejectPayout(@Param('payoutId') payoutId: string, @Body() dto: { reason: string }) {
    return this.adminService.rejectPayout(payoutId, dto.reason);
  }

  @Get('businesses/:businessId/ledger')
  @ApiOperation({ summary: 'View business ledger entries' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of ledger entries.' })
  async getBusinessLedger(@Param('businessId') businessId: string) {
    return this.adminService.getBusinessLedger(businessId);
  }
}
