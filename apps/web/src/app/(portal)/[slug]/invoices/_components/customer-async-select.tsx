"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import AsyncCreatableSelect from "react-select/async-creatable";

import { useTRPC } from "~/trpc/react";

interface CustomerOption {
  value: string;
  label: string;
  email: string | null;
  name: string | null;
  __isNew__?: boolean;
}

interface CustomerAsyncSelectProps {
  slug: string;
  onSelect: (customer: {
    id: string;
    email: string | null;
    name: string | null;
    isNew: boolean;
  }) => void;
  placeholder?: string;
}

export function CustomerAsyncSelect({
  slug,
  onSelect,
  placeholder,
}: CustomerAsyncSelectProps) {
  const t = useTranslations("InvoicesPage");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");

  const loadOptions = useCallback(
    async (inputValue: string): Promise<CustomerOption[]> => {
      if (!inputValue || inputValue.length < 1) {
        return [];
      }

      try {
        const results = await queryClient.fetchQuery(
          trpc.customer.search.queryOptions({
            slug,
            query: inputValue,
            take: 10,
          }),
        );

        return results.map((customer) => ({
          value: customer.id,
          label: customer.name ?? customer.email ?? customer.id,
          email: customer.email,
          name: customer.name,
        }));
      } catch {
        return [];
      }
    },
    [trpc, slug, queryClient],
  );

  const handleChange = (option: CustomerOption | null) => {
    if (!option) return;

    if (option.__isNew__) {
      // User wants to create a new customer
      onSelect({
        id: "",
        email: option.value, // The typed value is used as email
        name: null,
        isNew: true,
      });
    } else {
      onSelect({
        id: option.value,
        email: option.email,
        name: option.name,
        isNew: false,
      });
    }
  };

  const formatCreateLabel = (inputValue: string) => {
    return `${t("createNewCustomer")}: ${inputValue}`;
  };

  return (
    <AsyncCreatableSelect<CustomerOption, false>
      cacheOptions
      loadOptions={loadOptions}
      onChange={handleChange}
      onInputChange={setInputValue}
      inputValue={inputValue}
      placeholder={placeholder ?? t("selectCustomerPlaceholder")}
      formatCreateLabel={formatCreateLabel}
      isClearable
      noOptionsMessage={() =>
        inputValue ? t("noCustomersFound") : t("typeToSearch")
      }
      classNames={{
        control: () =>
          "!border-input !bg-background !min-h-10 !rounded-md !shadow-none hover:!border-input",
        menu: () => "!bg-background !border !border-input !rounded-md",
        option: (state) =>
          state.isFocused
            ? "!bg-accent !text-accent-foreground"
            : "!bg-background !text-foreground",
        singleValue: () => "!text-foreground",
        input: () => "!text-foreground",
        placeholder: () => "!text-muted-foreground",
        indicatorsContainer: () => "!text-muted-foreground",
        noOptionsMessage: () => "!text-muted-foreground",
      }}
      styles={{
        control: (base) => ({
          ...base,
          fontSize: "14px",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 50,
        }),
        option: (base) => ({
          ...base,
          fontSize: "14px",
          cursor: "pointer",
        }),
      }}
    />
  );
}
