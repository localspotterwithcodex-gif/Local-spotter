import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CONSUMER)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current consumer cart with totals' })
  @ApiResponse({ status: 200, description: 'Current shopping cart with items and subtotal.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires CONSUMER role).' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (increments quantity if already exists)' })
  @ApiResponse({ status: 201, description: 'Item added to cart.' })
  @ApiResponse({ status: 400, description: 'Invalid quantity, inactive product, or insufficient stock.' })
  @ApiResponse({ status: 403, description: 'Business has no active webshop subscription.' })
  @ApiResponse({ status: 404, description: 'Product, variant, or business not found.' })
  @ApiResponse({ status: 409, description: 'Cart already contains items from another business.' })
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  @ApiParam({ name: 'itemId', description: 'Cart item UUID' })
  @ApiResponse({ status: 200, description: 'Cart item updated.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid quantity.' })
  @ApiResponse({ status: 404, description: 'Cart or cart item not found.' })
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a single item from cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item UUID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  removeItem(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from consumer cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared.' })
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user);
  }
}
