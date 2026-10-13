import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateShopRegistrationDto {
  @ApiProperty({ example: "Anna's Boutique" })
  @IsString()
  @MaxLength(200, { message: 'Winkelnaam is te lang' })
  shopName: string;

  @ApiProperty({ example: 'Anna Smith' })
  @IsString()
  @MaxLength(200, { message: 'Naam contactpersoon is te lang' })
  contactPersonName: string;

  @ApiProperty({ example: 'hello@yourshop.com' })
  @IsEmail({}, { message: 'Ongeldig e-mailadres' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  phone?: string;

  @ApiProperty({ example: 'Kalverstraat 1, Amsterdam' })
  @IsString()
  @MaxLength(500, { message: 'Adres is te lang' })
  shopAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteInstagram?: string;

  @ApiProperty({ example: 'Fashion' })
  @IsString()
  @MaxLength(100, { message: 'Selecteer een winkeltype' })
  shopType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherShopType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productCount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sellsOnline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherSellsOnline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  webshopPos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherWebshopPos?: string;

  @ApiProperty({ example: 'Yes, definitely' })
  @IsString()
  @MaxLength(100, { message: 'Laat ons weten of je interesse hebt in de pilot' })
  pilotInterest: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valuableFeatures?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherFeature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  monthlyPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricingModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  routeInterest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  routeOffer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherRouteOffer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biggestChallenge?: string;
}
