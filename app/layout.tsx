import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getUser, getTeamForUser } from "@/lib/db/queries";
import { SWRConfig } from "swr";
import { ThemeProvider } from "@/components/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_FONT_SCALE, isFontScale } from "@/src/font-scale/config";
import { FontScaleProvider } from "@/src/font-scale/provider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: "Proller",
    description: t("description"),
    icons: {
      icon: [{ url: "/images/proller-icon.svg", type: "image/svg+xml" }],
    },
  };
}

const manrope = Manrope({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const savedScale = (await cookies()).get("font-scale")?.value;
  const fontScale = savedScale && isFontScale(savedScale) ? savedScale : DEFAULT_FONT_SCALE;
  return (
    <html lang={locale} data-font-scale={fontScale} suppressHydrationWarning className={manrope.className}>
      <body className="min-h-[100dvh] bg-gray-50 text-gray-950 dark:bg-background dark:text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SWRConfig
            value={{
              fallback: {
                // We do NOT await here
                // Only components that read this data will suspend
                "/api/user": getUser(),
                "/api/team": getTeamForUser(),
              },
            }}
          >
            <NextIntlClientProvider>
              <FontScaleProvider scale={fontScale}>{children}</FontScaleProvider>
            </NextIntlClientProvider>
          </SWRConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
