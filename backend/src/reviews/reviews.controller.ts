import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
@ApiTags('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post('businesses/:businessId/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review plaatsen' })
  @ApiResponse({
    status: 201,
    description: 'Review succesvol geplaatst',
  })
  async createReview(
    @Param() param: { businessId: string },
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.createReview(
      param.businessId,
      user.profileId,
      dto,
    );
  }

  @Get('businesses/:businessId/reviews')
  @ApiOperation({ summary: 'Gepubliceerde reviews van een bedrijf (publiek)' })
  @ApiResponse({ status: 200, description: 'Gepubliceerde reviews + samenvatting' })
  async getPublicBusinessReviews(@Param('businessId') businessId: string) {
    return this.reviewsService.getPublicBusinessReviews(businessId);
  }

  @Get('businesses/:businessId/reviews/manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alle reviews van een eigen bedrijf (eigenaar/admin)' })
  async getBusinessReviews(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.getBusinessReviews(businessId, user);
  }

  @Get('reviews/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eigen reviews van de ingelogde consument' })
  async getMyReviews(@CurrentUser() user: any) {
    return this.reviewsService.getConsumerReviews(user.profileId);
  }
}
