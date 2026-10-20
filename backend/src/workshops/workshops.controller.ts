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
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { QueryWorkshopDto } from './dto/query-workshop.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateSessionDto } from './dto/session.dto';
import { WorkshopSessionInputDto } from './dto/create-workshop.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@ApiTags('Workshops')
@Controller()
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  // ==========================================
  // PUBLIC WORKSHOP ENDPOINTS
  // ==========================================

  @Get('workshops')
  @ApiOperation({ summary: 'Get public workshop catalog with optional filters' })
  @ApiResponse({ status: 200, description: 'List of public workshops.' })
  async getPublicWorkshops(@Query() query: QueryWorkshopDto) {
    return this.workshopsService.getPublicWorkshops(query);
  }

  // NOTE: static `workshops/bookings` must be declared before `workshops/:workshopId`,
  // otherwise Express matches 'bookings' as a workshopId.
  @Get('workshops/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get consumer own workshop bookings' })
  @ApiResponse({ status: 200, description: 'List of consumer bookings.' })
  async getConsumerBookings(
    @CurrentUser() user: any,
    @Query() query: QueryBookingDto,
  ) {
    return this.workshopsService.getConsumerBookings(user, query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('workshops/:workshopId')
  @ApiOperation({ summary: 'Get public workshop details by ID' })
  @ApiResponse({ status: 200, description: 'Public workshop details.' })
  async getWorkshopById(
    @Param('workshopId') workshopId: string,
    @Req() req: any,
  ) {
    return this.workshopsService.getWorkshopById(workshopId, req?.user);
  }

  // ==========================================
  // OWNER WORKSHOP CRUD
  // ==========================================

  @Post('workshops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new workshop (requires WORKSHOP subscription entitlement)' })
  @ApiResponse({ status: 201, description: 'Workshop created successfully.' })
  async createWorkshop(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkshopDto,
  ) {
    return this.workshopsService.createWorkshop(user, dto);
  }

  @Get('businesses/:businessId/workshops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN, UserRole.CONSUMER) // employees are consumer accounts; the service checks the shop
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all workshops for owned business' })
  @ApiResponse({ status: 200, description: 'List of business workshops.' })
  async getBusinessWorkshops(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Query() query: QueryWorkshopDto,
  ) {
    return this.workshopsService.getBusinessWorkshops(businessId, user, query);
  }

  @Patch('workshops/:workshopId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workshop details (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Workshop updated successfully.' })
  async updateWorkshop(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateWorkshopDto,
  ) {
    return this.workshopsService.updateWorkshop(workshopId, user, dto);
  }

  @Delete('workshops/:workshopId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a workshop (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Workshop cancelled.' })
  async cancelWorkshop(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.cancelWorkshop(workshopId, user);
  }

  @Post('workshops/:workshopId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a workshop (alternative endpoint)' })
  @ApiResponse({ status: 200, description: 'Workshop cancelled.' })
  async cancelWorkshopAlt(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.cancelWorkshop(workshopId, user);
  }

  // ==========================================
  // SESSIONS & PARTICIPANTS (OWNER)
  // ==========================================

  @Post('workshops/:workshopId/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a session to a workshop' })
  async addSession(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
    @Body() dto: WorkshopSessionInputDto,
  ) {
    return this.workshopsService.addSession(workshopId, user, dto);
  }

  @Patch('workshops/:workshopId/sessions/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change time or capacity of a session' })
  async updateSession(
    @Param('workshopId') workshopId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.workshopsService.updateSession(workshopId, sessionId, user, dto);
  }

  @Post('workshops/:workshopId/sessions/:sessionId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel one session; participants are notified and refunded in full' })
  async cancelSession(
    @Param('workshopId') workshopId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.cancelSession(workshopId, sessionId, user);
  }

  @Get('workshops/:workshopId/participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN, UserRole.CONSUMER) // employees are consumer accounts; the service checks the shop
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Participant list for the organiser' })
  async getParticipants(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.workshopsService.getParticipants(workshopId, user, sessionId);
  }

  @Get('workshops/:workshopId/participants.csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN, UserRole.CONSUMER) // employees are consumer accounts; the service checks the shop
  @ApiBearerAuth()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="participants.csv"')
  @ApiOperation({ summary: 'Participant list as CSV' })
  async getParticipantsCsv(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.workshopsService.getParticipantsCsv(workshopId, user, sessionId);
  }

  // ==========================================
  // BOOKING ENDPOINTS
  // ==========================================

  @Post('workshops/:workshopId/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book seats for a workshop (price snapshot + atomic capacity)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully.' })
  async createBooking(
    @Param('workshopId') workshopId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateBookingDto,
  ) {
    return this.workshopsService.createBooking(workshopId, user, dto);
  }

  @Get('workshops/bookings/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single booking details (consumer, owner, or admin)' })
  @ApiResponse({ status: 200, description: 'Booking details.' })
  async getBookingById(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.getBookingById(bookingId, user);
  }

  @Get('businesses/:businessId/workshop-bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings for owned business workshops' })
  @ApiResponse({ status: 200, description: 'List of business workshop bookings.' })
  async getBusinessBookings(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Query() query: QueryBookingDto,
  ) {
    return this.workshopsService.getBusinessBookings(businessId, user, query);
  }

  @Post('workshops/bookings/:bookingId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel booking and restore capacity atomically' })
  @ApiResponse({ status: 200, description: 'Booking cancelled and capacity restored.' })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.cancelBooking(bookingId, user);
  }
}
