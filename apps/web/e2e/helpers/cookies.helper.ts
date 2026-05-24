import type { Cookie } from "@playwright/test";

const SESSION_COOKIE_RE = /^([^=]+)=([^;]+)/;

function parseCookiePair(pair: string): Pick<Cookie, "name" | "value"> | null {
  const execResult = SESSION_COOKIE_RE.exec(pair.trim());
  if (!execResult?.[1] || !execResult[2]) {
    return null;
  }
  return { name: execResult[1], value: execResult[2] };
}

/** Build Playwright cookies from better-auth login headers. */
export function sessionCookiesFromHeaders(
  headers: Headers,
  cookieHeader: string,
): Cookie[] {
  const setCookies =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];

  const rawPairs =
    setCookies.length > 0
      ? setCookies
      : cookieHeader
          .split(/,(?=\s*[^;,]+=)/)
          .map((part) => part.trim())
          .filter(Boolean);

  return rawPairs
    .map(parseCookiePair)
    .filter(
      (cookie): cookie is Pick<Cookie, "name" | "value"> => cookie !== null,
    )
    .map(
      (cookie): Cookie => ({
        ...cookie,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      }),
    );
}
