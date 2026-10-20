import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { FavoritesProvider } from "@/features/favorites/FavoritesContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { getInitialLocale, getServerT } from "@/i18n/server-locale";
import "./globals.css";

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
    <html lang={locale}>
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
