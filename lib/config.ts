/** Safe in Client Components — publishable key only. */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

/** Server/middleware — requires secret for auth to work. */
export function isClerkFullyConfigured(): boolean {
  return Boolean(
    isClerkConfigured() && process.env.CLERK_SECRET_KEY?.trim(),
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function isOneSignalConfigured(): boolean {
  return Boolean(
    process.env.ONESIGNAL_APP_ID?.trim() &&
      process.env.ONESIGNAL_API_KEY?.trim() &&
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim(),
  );
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
