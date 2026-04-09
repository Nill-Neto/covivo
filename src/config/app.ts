const DEFAULT_DEV_PUBLIC_URL = "http://localhost:8080";
const APP_PUBLIC_URL_ALIAS_SEPARATOR = ",";

const normalizeUrl = (url: string) => url.trim().replace(/\/$/, "");

export const resolveAppPublicUrl = (
  appPublicUrl: string | undefined,
  options: {
    mode: string;
    isDev: boolean;
    fallbackUrl?: string;
  }
) => {
  const normalizedConfiguredUrl = appPublicUrl?.trim().replace(/\/$/, "");

  if (normalizedConfiguredUrl) {
    console.info(`[app-config] APP_PUBLIC_URL (${options.mode}): ${normalizedConfiguredUrl}`);
    return normalizedConfiguredUrl;
  }

  const fallbackUrl = options.fallbackUrl?.trim().replace(/\/$/, "") || DEFAULT_DEV_PUBLIC_URL;
  const message = `[app-config] APP_PUBLIC_URL is not configured for mode "${options.mode}".`;

  if (options.isDev) {
    console.warn(`${message} Falling back to ${fallbackUrl}.`);
    return fallbackUrl;
  }

  console.error(`${message} Configure APP_PUBLIC_URL for this environment.`);
  throw new Error("APP_PUBLIC_URL is required outside development mode.");
};

const parseAliases = (aliases: string | undefined) =>
  aliases
    ?.split(APP_PUBLIC_URL_ALIAS_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeUrl) ?? [];

export const APP_PUBLIC_URL = resolveAppPublicUrl(import.meta.env.APP_PUBLIC_URL, {
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV || import.meta.env.MODE === "test",
  fallbackUrl: typeof window !== "undefined" ? window.location.origin : DEFAULT_DEV_PUBLIC_URL,
});

export const APP_PUBLIC_URL_ALIASES = parseAliases(import.meta.env.APP_PUBLIC_URL_ALIASES);

export const ENABLE_BRAND_DOMAIN_REDIRECT = import.meta.env.ENABLE_BRAND_DOMAIN_REDIRECT === "true";

const getOrigin = (url: string) => new URL(url).origin;

export const buildInviteUrl = (token: string) => `${APP_PUBLIC_URL}/invite?token=${token}`;

export const resolveCanonicalDomainRedirect = (pathnameWithQueryAndHash: string) => {
  if (!ENABLE_BRAND_DOMAIN_REDIRECT || typeof window === "undefined") return null;

  const currentOrigin = normalizeUrl(window.location.origin);
  const canonicalOrigin = getOrigin(APP_PUBLIC_URL);
  const aliasOrigins = APP_PUBLIC_URL_ALIASES.map((url) => {
    try {
      return getOrigin(url);
    } catch {
      return "";
    }
  }).filter(Boolean);

  if (currentOrigin === canonicalOrigin) return null;
  if (!aliasOrigins.includes(currentOrigin)) return null;

  return `${APP_PUBLIC_URL}${pathnameWithQueryAndHash}`;
};
