/**
 * Optional social sign-in providers for waslapp.
 *
 * Grok broker federation (grok-google / grok-x) was removed. waslapp is a
 * standalone product: phone/email + password is the primary auth. Keep empty
 * until product OAuth apps are wired with their own env secrets.
 */
export type AuthSocialProvider = {
  providerId: string;
  idp?: string;
  label: string;
};

export const AUTH_SOCIAL_PROVIDERS: readonly AuthSocialProvider[] = [];
