import { Geist_Mono, Inter } from "next/font/google";

import "@workspace/ui/globals.css";

import { cn } from "@workspace/ui/lib/utils";

import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getLocale } from "@/lib/i18n";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { dirFor } from "@workspace/i18n/dictionaries";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "ba2olak — بقولك",
  description: "You want it. We buy it. We deliver it.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <TRPCReactProvider>
            <I18nProvider defaultLocale={locale}>{children}</I18nProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
