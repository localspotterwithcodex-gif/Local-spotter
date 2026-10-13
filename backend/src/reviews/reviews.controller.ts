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

@Controller('businesses')
@ApiTags('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post(':businessId')
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
      user.consumerProfileId,
      dto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reviews ophalen voor bedrijf' })
  @ApiResponse({
    description: 'Lijst van reviews voor bedrijf',
  })
  async getBusinessReviews(
    @Param() param: { businessId: string },
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.getBusinessReviews(
      param.businessId,
      user,
    );
  }
}