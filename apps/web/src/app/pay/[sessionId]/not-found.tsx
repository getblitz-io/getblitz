import Link from "next/link";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-12">
      {/* Decorative background glow 
          using glassmorphism and subtle gradients for a premium feel
      */}
      <div className="bg-primary/20 absolute -top-40 right-[-10%] h-96 w-96 rounded-full blur-[128px]" />
      <div className="bg-destructive/10 absolute bottom-[-10%] -left-20 h-80 w-80 rounded-full blur-[100px]" />

      {/* Main Card */}
      <div className="bg-card border-border/50 relative w-full max-w-lg overflow-hidden rounded-3xl border p-8 shadow-2xl sm:p-12">
        <div className="from-primary/50 to-primary absolute inset-x-0 top-0 h-1 bg-linear-to-r" />

        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary ring-primary/5 mb-6 flex h-24 w-24 items-center justify-center rounded-full ring-8 sm:h-28 sm:w-28">
            <ExclamationTriangleIcon
              className="h-12 w-12 sm:h-14 sm:w-14"
              strokeWidth={1.5}
            />
          </div>

          <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>

          <p className="text-muted-foreground mb-10 max-w-[280px] text-lg leading-relaxed sm:max-w-sm">
            {t("description")}
          </p>

          <div className="flex w-full flex-col sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              {t("returnToHomepage")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
