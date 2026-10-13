import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevFileMailProvider, MAIL_PROVIDER, MailProvider, ResendMailProvider, UnconfiguredMailProvider } from './mail.provider';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailProvider => {
        const transport = config.get<string>('MAIL_TRANSPORT');
        if (transport === 'dev-file' && config.get<string>('NODE_ENV') !== 'production') {
          return new DevFileMailProvider();
        }
        if (transport === 'resend') {
          const apiKey = config.get<string>('RESEND_API_KEY');
          const from = config.get<string>('MAIL_FROM');
          if (apiKey && from) return new ResendMailProvider({ apiKey, from });
        }
        return new UnconfiguredMailProvider();
      },
    },
  ],
  exports: [MAIL_PROVIDER],
})
export class MailModule {}
