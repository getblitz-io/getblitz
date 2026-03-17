import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("privacyPolicy");

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-32 pb-16">
        <div className="text-muted-foreground mx-auto max-w-3xl space-y-8">
          <h1 className="font-display text-foreground mb-8 text-4xl font-bold">
            {t("title")}
          </h1>

          <p>{t("intro")}</p>

          <section className="space-y-2">
            <h2 className="text-foreground mt-8 mb-4 text-xl font-semibold">
              {t("sections.0.title")}
            </h2>
            <p>{t("sections.0.content")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground mt-8 mb-4 text-xl font-semibold">
              {t("sections.1.title")}
            </h2>
            <p>{t("sections.1.content")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground mt-8 mb-4 text-xl font-semibold">
              {t("sections.2.title")}
            </h2>
            <p>{t("sections.2.content")}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-foreground mt-8 mb-4 text-xl font-semibold">
              {t("sections.3.title")}
            </h2>
            <p>
              {t("sections.3.content")}{" "}
              <a
                href={`mailto:${t("sections.3.email")}`}
                className="text-primary hover:underline"
              >
                {t("sections.3.email")}
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
