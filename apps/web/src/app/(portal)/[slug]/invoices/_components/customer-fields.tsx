"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";

interface CustomerFieldsProps {
  email: string;
  name: string;
  address: string;
  taxId: string;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onTaxIdChange: (value: string) => void;
  emailRequired?: boolean;
  emailError?: string;
  nameError?: string;
  addressError?: string;
  taxIdError?: string;
}

export function CustomerFields({
  email,
  name,
  address,
  taxId,
  onEmailChange,
  onNameChange,
  onAddressChange,
  onTaxIdChange,
  emailRequired = false,
  emailError,
  nameError,
  addressError,
  taxIdError,
}: CustomerFieldsProps) {
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customerSection")}</CardTitle>
        <CardDescription>{t("customerSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>
            {t("emailLabel")} {emailRequired && "*"}
          </Label>
          <Input
            type="email"
            placeholder={tCommon("placeholders.email")}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("nameLabel")}</Label>
          <Input
            type="text"
            placeholder={tCommon("placeholders.name")}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          {nameError && <p className="text-sm text-red-500">{nameError}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("addressLabel")}</Label>
          <Input
            type="text"
            placeholder={tCommon("placeholders.address")}
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
          {addressError && (
            <p className="text-sm text-red-500">{addressError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("taxIdLabel")}</Label>
          <Input
            type="text"
            placeholder={tCommon("placeholders.taxId")}
            value={taxId}
            onChange={(e) => onTaxIdChange(e.target.value)}
          />
          {taxIdError && <p className="text-sm text-red-500">{taxIdError}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
