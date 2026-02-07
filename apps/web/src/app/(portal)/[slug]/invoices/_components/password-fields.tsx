"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";

interface PasswordFieldsProps {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (password: string) => void;
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  isPasswordProtected?: boolean;
  removePassword?: boolean;
  onRemovePasswordToggle?: () => void;
}

export function PasswordFields({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  isPasswordProtected = false,
  removePassword = false,
  onRemovePasswordToggle,
}: PasswordFieldsProps) {
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("expirationSecuritySection")}</CardTitle>
        <CardDescription>{t("expirationSecurityDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPasswordProtected && onRemovePasswordToggle && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <span className="text-sm text-amber-700">
              {t("passwordProtected")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={onRemovePasswordToggle}
            >
              {removePassword ? tCommon("actions.cancel") : t("removePassword")}
            </Button>
          </div>
        )}

        {!removePassword && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {isPasswordProtected
                  ? `New ${t("passwordLabel")}`
                  : t("passwordLabel")}
              </Label>
              <Input
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("passwordConfirmLabel")}</Label>
              <Input
                type="password"
                placeholder={t("passwordConfirmPlaceholder")}
                value={passwordConfirm}
                onChange={(e) => onPasswordConfirmChange(e.target.value)}
              />
            </div>
          </div>
        )}
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
      </CardContent>
    </Card>
  );
}
