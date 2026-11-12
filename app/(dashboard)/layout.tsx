"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/db/schema";
import useSWR from "swr";
import { ModeToggle } from "@/components/ui/modeToggle";
import Image from "next/image";
import LanguageSwitcher from "@/src/components/languageSwitcher";
import FontScaleSwitcher from "@/src/components/fontScaleSwitcher";
import { useTranslations } from "next-intl";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserLink() {
  const t = useTranslations("Header");
  const { data: user } = useSWR<User | null>("/api/user", fetcher);

  if (user) return null;

  return (
    <Button asChild className="rounded-sm">
      <Link href="/sign-up">{t("signUp")}</Link>
    </Button>
  );
}

function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/proller-logo.svg"
            alt="Proller"
            width={165}
            height={35}
            className="dark:hidden"
          />
          <Image
            src="/images/proller-logo-dark.svg"
            alt="Proller"
            width={165}
            height={35}
            className="hidden dark:block"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <FontScaleSwitcher />
          <LanguageSwitcher />
          <ModeToggle />
          <Suspense fallback={<div className="h-9" />}>
            <UserLink />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen">
      <Header />
      {children}
    </section>
  );
}
