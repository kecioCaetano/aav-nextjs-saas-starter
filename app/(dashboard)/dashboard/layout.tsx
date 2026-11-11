"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, Settings, Shield, Activity, Menu, House, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { mutate } from "swr";
import { signOut } from "@/app/(login)/actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = useTranslations("Menu");
  const header = useTranslations("Header");

  async function handleSignOut() {
    await signOut();
    mutate("/api/user");
    router.push("/");
  }

  const navItems = [
    { href: "/dashboard/team", icon: Users, label: t("team") },
    { href: "/dashboard/general", icon: Settings, label: t("general") },
    { href: "/dashboard/activity", icon: Activity, label: t("activity") },
    { href: "/dashboard/security", icon: Shield, label: t("security") },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-background border-b border-gray-200 dark:border-border p-4">
        <div className="flex items-center">
          <span className="font-medium">
            {pathname === "/dashboard"
              ? t("welcome")
              : t("settings")}
          </span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">{t("toggleSidebar")}</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 dark:bg-background lg:dark:bg-background border-r border-gray-200 dark:border-border lg:block ${
            isSidebarOpen ? "block" : "hidden"
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            <Button
              asChild
              variant={pathname === "/dashboard" ? "secondary" : "ghost"}
              className={`mb-2 w-full justify-start shadow-none ${
                pathname === "/dashboard"
                  ? "bg-gray-100 dark:bg-secondary"
                  : ""
              }`}
            >
              <Link
                href="/dashboard"
                aria-current={
                  pathname === "/dashboard" ? "page" : undefined
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <House className="h-4 w-4" />
                {t("welcome")}
              </Link>
            </Button>
            <Accordion type="single" collapsible defaultValue="settings">
              <AccordionItem value="settings" className="border-b-0">
                <AccordionTrigger className="px-3 hover:no-underline hover:bg-gray-100 dark:hover:bg-secondary">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t("settings")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-1 pl-3">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Button
                        key={item.href}
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        className={`shadow-none w-full justify-start ${
                          isActive ? "bg-gray-100 dark:bg-secondary" : ""
                        }`}
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </Button>
                    );
                  })}
                  <form action={handleSignOut}>
                    <Button type="submit" variant="ghost" className="w-full justify-start shadow-none">
                      <LogOut className="h-4 w-4" />
                      {header("signOut")}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
