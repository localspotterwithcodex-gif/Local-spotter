import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LocalizeInterceptor } from './localize.interceptor';
import { DeepLTranslationProvider, TRANSLATION_PROVIDER, TranslationProvider, UnconfiguredTranslationProvider } from './translation.provider';
import { TranslationService } from './translation.service';

@Global()
@Module({
  providers: [
    {
      provide: TRANSLATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TranslationProvider => {
        const apiKey = config.get<string>('DEEPL_API_KEY');
        return apiKey ? new DeepLTranslationProvider({ apiKey }) : new UnconfiguredTranslationProvider();
      },
    },
    TranslationService,
    { provide: APP_INTERCEPTOR, useClass: LocalizeInterceptor },
  ],
  exports: [TranslationService],
})
export class TranslationModule {}
