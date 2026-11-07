"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "../i18n/actions";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function handleLanguageChange(nextLocale: string) {
    setError(false);

    startTransition(async () => {
      try {
        await setLocale(nextLocale);
        router.refresh();
      } catch (error) {
        console.error("Failed to change language:", error);
        setError(true);
      }
    });
  }

  return (
    <div>
      <select
        value={locale}
        onChange={(event) => handleLanguageChange(event.target.value)}
        disabled={isPending}
        aria-label={t("label")}
        className="bg-neutral-100 dark:bg-neutral-800 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="pt">🇧🇷 Portuguese</option>
        <option value="en">🇺🇸 English</option>
        <option value="es">🇪🇸 Spanish</option>
      </select>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {t("error")}
        </p>
      )}
    </div>
  );
}
