import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useTranslations } from "next-intl";

interface PrivacySection {
  title: string;
  content: string;
  email?: string;
}

export default function PrivacyPage() {
  const t = useTranslations("privacyPolicy");
  const sections = t.raw("sections") as PrivacySection[];

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 pt-32 pb-16">
        <div className="text-muted-foreground mx-auto max-w-3xl space-y-8">
          <h1 className="font-display text-foreground mb-8 text-4xl font-bold">
            {t("title")}
          </h1>

          <p>{t("intro")}</p>

          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-foreground mt-8 mb-4 text-xl font-semibold">
                {section.title}
              </h2>
              <p>
                {section.content}
                {section.email && (
                  <>
                    {" "}
                    <a
                      href={`mailto:${section.email}`}
                      className="text-primary hover:underline"
                    >
                      {section.email}
                    </a>
                  </>
                )}
              </p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
