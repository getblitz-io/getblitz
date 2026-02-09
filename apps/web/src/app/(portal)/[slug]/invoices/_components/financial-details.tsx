"use client";

import { useTranslations } from "next-intl";

import type { LineItem } from "@getblitz/validators";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";

import { calculateSubtotalCents } from "./line-items-editor";

interface FinancialDetailsProps {
  taxRatePercent: string;
  discountAmount: string;
  onTaxRateChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
  lineItems: LineItem[];
  // For edit mode fallback when no line items
  defaultSubtotalCents?: number;
  taxRateError?: string;
  discountError?: string;
}

export function FinancialDetails({
  taxRatePercent,
  discountAmount,
  onTaxRateChange,
  onDiscountChange,
  lineItems,
  defaultSubtotalCents = 0,
  taxRateError,
  discountError,
}: FinancialDetailsProps) {
  const t = useTranslations("InvoicesPage");

  // Calculate amounts
  const subtotalCents =
    lineItems.length > 0
      ? calculateSubtotalCents(lineItems)
      : defaultSubtotalCents;
  const taxRateBps = taxRatePercent
    ? Math.round(parseFloat(taxRatePercent) * 100)
    : 0;
  const discountCents = discountAmount
    ? Math.round(parseFloat(discountAmount) * 100)
    : 0;
  const taxAmountCents = Math.round((subtotalCents * taxRateBps) / 10000);
  const totalCents = subtotalCents + taxAmountCents - discountCents;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("financialDetails")}</CardTitle>
        <CardDescription>{t("financialDetailsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tax and Discount Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("taxRateLabel")}</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={taxRatePercent}
                onChange={(e) => onTaxRateChange(e.target.value)}
                className="pr-8"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                %
              </span>
            </div>
            {taxRateError && (
              <p className="text-sm text-red-500">{taxRateError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("discountLabel")}</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                €
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={discountAmount}
                onChange={(e) => onDiscountChange(e.target.value)}
                className="pl-8"
              />
            </div>
            {discountError && (
              <p className="text-sm text-red-500">{discountError}</p>
            )}
          </div>
        </div>

        {/* Amount Breakdown */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>€{(subtotalCents / 100).toFixed(2)}</span>
          </div>
          {taxAmountCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("tax")} ({(taxRateBps / 100).toFixed(1)}%)
              </span>
              <span>€{(taxAmountCents / 100).toFixed(2)}</span>
            </div>
          )}
          {discountCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("discount")}</span>
              <span className="text-green-600">
                -€{(discountCents / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-lg font-semibold">
            <span>{t("total")}</span>
            <span>€{(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
