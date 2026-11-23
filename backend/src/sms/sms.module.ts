import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMS_SENDER, smsSenderFromConfig } from './sms-sender';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [
    { provide: SMS_SENDER, inject: [ConfigService], useFactory: (config: ConfigService) => smsSenderFromConfig((k) => config.get<string>(k)) },
    SmsService,
  ],
  exports: [SmsService, SMS_SENDER],
})
export class SmsModule {}
