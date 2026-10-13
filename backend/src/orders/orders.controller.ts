import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Orders')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ==========================================
  // CONSUMER ENDPOINTS
  // ==========================================

  @Post('orders')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({
    summary: 'Create order from current consumer cart (Transactional checkout)',
    description:
      'Converts the authenticated consumer cart into an order, takes immutable price/variant snapshots, deducts stock atomically, and clears the cart.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Empty cart, inactive product, or invalid address.' })
  @ApiResponse({ status: 403, description: 'Business has no active webshop subscription.' })
  @ApiResponse({ status: 409, description: 'Insufficient stock for product/variant.' })
  async createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrderFromCart(user, dto);
  }

  @Get('orders')
  @Roles(UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get list of orders for the authenticated consumer' })
  @ApiResponse({ status: 200, description: 'Paginated list of consumer orders.' })
  async getConsumerOrders(@CurrentUser() user: any, @Query() query: OrderQueryDto) {
    return this.ordersService.getConsumerOrders(user, query);
  }

  @Get('orders/:orderId')
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get single order details by ID' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details with snapshots and items.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the ordering consumer, owning business, or admin).' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async getOrderById(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.ordersService.getOrderById(orderId, user);
  }

  // ==========================================
  // BUSINESS OWNER ENDPOINTS
  // ==========================================

  @Get('businesses/:businessId/orders')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get orders received by a specific owned business' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of business orders.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user does not own this business).' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async getBusinessOrders(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.getBusinessOrders(businessId, user, query);
  }

  @Patch('orders/:orderId/status')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update order status with transition validation',
    description:
      'Enforces strict lifecycle transitions (e.g. PENDING -> CONFIRMED/ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED). Rejection or cancellation automatically restores stock.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or order in terminal state.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the owning business or admin).' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(orderId, user, dto);
  }

  // ==========================================
  // CANCELLATION ENDPOINT
  // ==========================================

  @Post('orders/:orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Cancel an order and restore inventory stock',
    description:
      'Consumers can cancel before fulfillment begins (PENDING or CONFIRMED). Business owners and admins can cancel before terminal delivery.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock restored.' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in its current state.' })
  @ApiResponse({ status: 403, description: 'Forbidden (unauthorized to cancel this order).' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(orderId, user, dto);
  }
}
