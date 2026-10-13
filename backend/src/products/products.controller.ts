import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  @Get('products/categories')
  @ApiOperation({ summary: 'Get list of active product categories' })
  @ApiResponse({ status: 200, description: 'Active product categories.' })
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get('products')
  @ApiOperation({ summary: 'Get public product feed with optional filters' })
  @ApiResponse({ status: 200, description: 'Filtered list of public products.' })
  async getPublicProducts(@Query() query: QueryProductDto) {
    return this.productsService.getPublicProducts(query);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get public product details by ID or slug' })
  @ApiResponse({ status: 200, description: 'Public product details.' })
  async getPublicProduct(@Param('productId') productId: string, @Req() req: any) {
    return this.productsService.getPublicProductByIdOrSlug(productId, req?.user);
  }

  // ==========================================
  // OWNER PRODUCT CRUD
  // ==========================================

  @Post('businesses/:businessId/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product for owned business (requires PRODUCTS subscription entitlement)' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  async createProduct(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createProduct(businessId, user, dto);
  }

  @Get('businesses/:businessId/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products for owned business' })
  @ApiResponse({ status: 200, description: 'List of business products.' })
  async getProductsForBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.getProductsForBusiness(businessId, user);
  }

  @Patch('products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product details (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  async updateProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(productId, user, dto);
  }

  @Delete('products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a product (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Product soft-deleted.' })
  async deleteProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.deleteProduct(productId, user);
  }

  // ==========================================
  // PRODUCT IMAGES (MAX 3)
  // ==========================================

  @Post('products/:productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an image to product (Strictly max 3 images per product)' })
  @ApiResponse({ status: 201, description: 'Image added successfully.' })
  async addImage(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productsService.addImage(productId, user, dto);
  }

  @Get('products/:productId/images')
  @ApiOperation({ summary: 'Get product images sorted by display order' })
  @ApiResponse({ status: 200, description: 'List of product images.' })
  async getImages(@Param('productId') productId: string) {
    return this.productsService.getImages(productId);
  }

  @Delete('products/:productId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product image (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Image deleted.' })
  async deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.deleteImage(productId, imageId, user);
  }

  // ==========================================
  // PRODUCT VARIANTS
  // ==========================================

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a variant for product (size, color, sku, price, stock)' })
  @ApiResponse({ status: 201, description: 'Variant created successfully.' })
  async addVariant(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariant(productId, user, dto);
  }

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'Get product variants' })
  @ApiResponse({ status: 200, description: 'List of product variants.' })
  async getVariants(@Param('productId') productId: string) {
    return this.productsService.getVariants(productId);
  }

  @Patch('products/:productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variant (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Variant updated.' })
  async updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(productId, variantId, user, dto);
  }

  @Delete('products/:productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product variant (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Variant deleted.' })
  async deleteVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.deleteVariant(productId, variantId, user);
  }
}
