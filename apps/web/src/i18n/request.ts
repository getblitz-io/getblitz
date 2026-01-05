import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const supportedLocales = ["en", "de", "fr"] as const;

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value ?? "en";
  const locale = supportedLocales.includes(
    cookieLocale as (typeof supportedLocales)[number],
  )
    ? cookieLocale
    : "en";

  return {
    locale,
    messages: await getLocaleMessages(locale),
  };
});

async function getLocaleMessages(
  locale: string,
): Promise<Record<string, unknown>> {
  const messages = (await import(`../../messages/${locale}.ts`)) as {
    default: Record<string, unknown>;
  };

  return messages.default;
}
