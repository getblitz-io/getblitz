import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useTranslations } from "next-intl";

export default function ImpressumPage() {
  const t = useTranslations("impressum");

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-32 pb-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <h1 className="font-display text-foreground text-4xl font-bold">
            {t("title")}
          </h1>

          <section className="space-y-2">
            <h2 className="text-foreground text-xl font-semibold">
              {t("tmg.title")}
            </h2>
            <p
              className="text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: t.raw("tmg.content") }}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground text-xl font-semibold">
              {t("register.title")}
            </h2>
            <p
              className="text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: t.raw("register.content") }}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground text-xl font-semibold">
              {t("representedBy.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("representedBy.content")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground text-xl font-semibold">
              {t("contact.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("contact.email")}{" "}
              <a
                href={`mailto:${t("contact.emailAddress")}`}
                className="text-primary hover:underline"
              >
                {t("contact.emailAddress")}
              </a>
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("contact.inquiries")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground text-xl font-semibold">
              {t("disclaimer.title")}
            </h2>
            <p className="text-muted-foreground">{t("disclaimer.content")}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
