import { El_Messiri, Geist_Mono, Tajawal } from "next/font/google";
import { Toaster } from "sonner";

import "@workspace/ui/globals.css";

import { cn } from "@workspace/ui/lib/utils";

import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getLocale } from "@/lib/i18n";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { dirFor } from "@workspace/i18n/dictionaries";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "ba2olak — بقولك",
  description: "You want it. We buy it. We deliver it.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
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
        tajawal.variable,
        elMessiri.variable,
        "font-sans",
      )}
    >
      <body>
        <ThemeProvider>
          <TRPCReactProvider>
            <I18nProvider defaultLocale={locale}>{children}</I18nProvider>
          </TRPCReactProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
