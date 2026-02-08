import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@getblitz/ui";

export async function InvoiceErrorPage() {
  const t = await getTranslations("InvoicePaymentPage");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500/50 bg-red-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">{t("invoiceNotFound")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("invoiceNotFoundDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
