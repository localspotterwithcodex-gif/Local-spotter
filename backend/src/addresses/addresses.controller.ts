import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Controller('addresses')
@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CONSUMER)
export class AddressesController {
  constructor(private addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Mijn opgeslagen bezorgadressen' })
  list(@CurrentUser() user: AuthUser) {
    return this.addresses.list(user.profileId);
  }

  @Post()
  @ApiOperation({ summary: 'Adres toevoegen' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user.profileId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Adres wijzigen of als standaard instellen' })
  update(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAddressDto) {
    return this.addresses.update(user.profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Adres verwijderen' })
  remove(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.addresses.remove(user.profileId, id);
  }
}
