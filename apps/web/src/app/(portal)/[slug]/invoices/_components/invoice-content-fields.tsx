"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@getblitz/ui";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";

interface InvoiceContentFieldsProps {
  invoiceNumber: string;
  description: string;
  notes: string;
  onInvoiceNumberChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  invoiceNumberError?: string;
  descriptionError?: string;
  notesError?: string;
}

export function InvoiceContentFields({
  invoiceNumber,
  description,
  notes,
  onInvoiceNumberChange,
  onDescriptionChange,
  onNotesChange,
  invoiceNumberError,
  descriptionError,
  notesError,
}: InvoiceContentFieldsProps) {
  const t = useTranslations("InvoicesPage");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invoiceContent")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("invoiceNumberLabel")}</Label>
          <Input
            type="text"
            placeholder={t("invoiceNumberPlaceholder")}
            value={invoiceNumber}
            onChange={(e) => onInvoiceNumberChange(e.target.value)}
          />
          {invoiceNumberError && (
            <p className="text-sm text-red-500">{invoiceNumberError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("descriptionLabel")}</Label>
          <Input
            type="text"
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
          {descriptionError && (
            <p className="text-sm text-red-500">{descriptionError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("notesLabel")}</Label>
          <Input
            type="text"
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
          {notesError && <p className="text-sm text-red-500">{notesError}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
