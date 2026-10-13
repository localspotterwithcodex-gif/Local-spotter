import type { Metadata } from "next";
import { AuthProvider } from "@/features/auth/AuthContext";
import { CartProvider } from "@/features/cart/CartContext";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { getInitialLocale } from "@/i18n/server-locale";
import { FeedbackButton } from "@/components/widgets/FeedbackButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalSpotter.nl — Ontdek Lokale Winkels & Shoproutes",
  description: "Het platform voor lokale winkels, ambachtelijke producten, shoproutes en creatieve workshops in Nederland.",
};

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
            <CartProvider>{children}</CartProvider>
          </AuthProvider>
        </LocaleProvider>
        {/* Draggable feedback launcher — shown on every page, opens the
            shop-owner registration form in a new tab when clicked */}
        <FeedbackButton />
      </body>
    </html>
  );
}
