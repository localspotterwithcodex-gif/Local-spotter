import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { AdminCategoriesService, CategoryKind } from './admin-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

enum Kind {
  business = 'business',
  product = 'product',
}

@ApiTags('Admin')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Get(':kind')
  @ApiOperation({ summary: 'All categories of a kind (business | product), including inactive ones' })
  list(@Param('kind', new ParseEnumPipe(Kind)) kind: CategoryKind) {
    return this.categories.list(kind);
  }

  @Post(':kind')
  @ApiOperation({ summary: 'Create a category' })
  create(@Param('kind', new ParseEnumPipe(Kind)) kind: CategoryKind, @Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categories.create(user.id, kind, dto);
  }

  @Patch(':kind/:id')
  @ApiOperation({ summary: 'Rename, reorder, (de)activate a category' })
  update(
    @Param('kind', new ParseEnumPipe(Kind)) kind: CategoryKind,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categories.update(user.id, kind, id, dto);
  }

  @Delete(':kind/:id')
  @ApiOperation({ summary: 'Delete an unused category' })
  remove(@Param('kind', new ParseEnumPipe(Kind)) kind: CategoryKind, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.categories.remove(user.id, kind, id);
  }
}
