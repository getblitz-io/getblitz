"use client";

import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
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

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

interface LineItemsEditorProps {
  lineItems: LineItem[];
  onLineItemsChange: (lineItems: LineItem[]) => void;
  showSubtotal?: boolean;
}

export function LineItemsEditor({
  lineItems,
  onLineItemsChange,
  showSubtotal = true,
}: LineItemsEditorProps) {
  const t = useTranslations("InvoicesPage");

  const addLineItem = () => {
    onLineItemsChange([
      ...lineItems,
      { description: "", quantity: 1, unitPriceCents: 0 },
    ]);
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const updated = lineItems.map((item, i) => {
      if (i !== index) return item;
      if (field === "description") {
        return { ...item, description: value as string };
      } else if (field === "quantity") {
        return { ...item, quantity: Number(value) || 0 };
      } else {
        return {
          ...item,
          unitPriceCents: Math.round(Number(value) * 100) || 0,
        };
      }
    });
    onLineItemsChange(updated);
  };

  const removeLineItem = (index: number) => {
    onLineItemsChange(lineItems.filter((_, i) => i !== index));
  };

  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("lineItemsSection")}</CardTitle>
            <CardDescription>
              {t("lineItemsSectionDescription")}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            {t("addLineItem")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noLineItems")}</p>
        ) : (
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{t("lineItemDescription")}</Label>
                  <Input
                    type="text"
                    placeholder={t("lineItemDescriptionPlaceholder")}
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">{t("lineItemQuantity")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(index, "quantity", e.target.value)
                    }
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">{t("lineItemPrice")}</Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      €
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      value={(item.unitPriceCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateLineItem(index, "unitPriceCents", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <p className="text-sm font-medium">
                    €{((item.quantity * item.unitPriceCents) / 100).toFixed(2)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                >
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            {showSubtotal && lineItems.length > 0 && (
              <div className="flex justify-between border-t pt-3">
                <span className="font-medium">{t("subtotal")}</span>
                <span className="font-medium">
                  €{(subtotalCents / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function calculateSubtotalCents(lineItems: LineItem[]): number {
  return lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
}
