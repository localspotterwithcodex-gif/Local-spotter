import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SocialProvider = 'google' | 'facebook';

export interface VerifiedSocialProfile {
  provider: SocialProvider;
  providerAccountId: string;
  email: string | null;
  /** True only when the provider vouches for the email address. */
  emailVerified: boolean;
  name: string | null;
}

const TIMEOUT_MS = 8000;

/**
 * Verifies a token that the browser obtained from Google / Facebook by asking
 * the PROVIDER itself (no signature code of our own, no extra dependency).
 * The audience / app id is always checked so a token issued to another app
 * cannot be replayed here. Tokens are never logged.
 */
@Injectable()
export class SocialTokenVerifier {
  private readonly logger = new Logger(SocialTokenVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(provider: SocialProvider, token: string): Promise<VerifiedSocialProfile> {
    return provider === 'google' ? this.verifyGoogle(token) : this.verifyFacebook(token);
  }

  private async getJson(url: string): Promise<Record<string, any>> {
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      this.logger.warn(`Social provider request failed (${err instanceof Error ? err.name : 'error'})`);
      throw new HttpException('Inloggen via deze dienst is tijdelijk niet beschikbaar', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) throw new UnauthorizedException('Ongeldige inlogpoging');
    return (await res.json()) as Record<string, any>;
  }

  private async verifyGoogle(idToken: string): Promise<VerifiedSocialProfile> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new HttpException('Inloggen met Google is niet ingesteld', HttpStatus.SERVICE_UNAVAILABLE);

    const data = await this.getJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const issuerOk = data.iss === 'accounts.google.com' || data.iss === 'https://accounts.google.com';
    if (data.aud !== clientId || !issuerOk || !data.sub || Number(data.exp) * 1000 < Date.now()) {
      throw new UnauthorizedException('Ongeldige inlogpoging');
    }
    return {
      provider: 'google',
      providerAccountId: String(data.sub),
      email: typeof data.email === 'string' ? data.email.toLowerCase() : null,
      emailVerified: data.email_verified === true || data.email_verified === 'true',
      name: typeof data.name === 'string' ? data.name : null,
    };
  }

  private async verifyFacebook(accessToken: string): Promise<VerifiedSocialProfile> {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET');
    if (!appId || !appSecret) throw new HttpException('Inloggen met Facebook is niet ingesteld', HttpStatus.SERVICE_UNAVAILABLE);

    const debug = await this.getJson(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
    );
    const info = debug.data ?? {};
    if (!info.is_valid || String(info.app_id) !== appId || !info.user_id) {
      throw new UnauthorizedException('Ongeldige inlogpoging');
    }
    const me = await this.getJson(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
    if (String(me.id) !== String(info.user_id)) throw new UnauthorizedException('Ongeldige inlogpoging');
    const email = typeof me.email === 'string' ? me.email.toLowerCase() : null;
    // Facebook only returns an email address it has confirmed for the account.
    return { provider: 'facebook', providerAccountId: String(me.id), email, emailVerified: !!email, name: typeof me.name === 'string' ? me.name : null };
  }
}
