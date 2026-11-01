import type { Metadata } from "next";
import { Manrope, Montserrat, Rubik } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { FavoritesProvider } from "@/features/favorites/FavoritesContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { getInitialLocale, getServerT } from "@/i18n/server-locale";
import "./globals.css";

// Self-hosted by next/font (no request to Google, no layout shift). Rubik includes 800: headings use font-extrabold.
const manrope = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--ff-manrope" });
const rubik = Rubik({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--ff-rubik" });
// Logo wordmark only.
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "800"], variable: "--ff-logo" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getInitialLocale();
  return (
    <html lang={locale} className={`${manrope.variable} ${rubik.variable} ${montserrat.variable}`}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>{children}</FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
