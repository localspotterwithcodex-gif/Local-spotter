import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Backend system health check' })
  @ApiResponse({ status: 200, description: 'Backend service and database connectivity operational.' })
  async checkHealth() {
    let dbConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err) {
      dbConnected = false;
    }

    return {
      status: dbConnected ? 'ok' : 'degraded',
      service: 'LocalSpotter REST API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      databaseConnected: dbConnected,
      // Only whether payments are set up, never the key itself.
      paymentsConfigured: Boolean(this.config.get<string>('STRIPE_SECRET_KEY')?.trim()),
    };
  }
}
