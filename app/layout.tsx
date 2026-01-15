import { Metadata } from "next";
import "../styles/globals.css";

const baseURL = "https://oracast.markets";
const title = "Oracast Markets | Ritual";
const description = "Oracast Markets for the web with Hono.js";
const keywords = ["Oracast Markets", "Ritual", "developer", "blockchain", "evm", "dashboard"];
const authors = [{ name: "Val Alexander" }];
const openGraph = {
  title: "Oracast Markets | Ritual",
  description: "Oracast Markets for the web",
  type: "website",
  images: [{ url: `${baseURL}/og-image.png`, width: 1200, height: 630 }],
};
const icons = {
  icon: "/favicon.ico",
  apple: "/icons/apple-touch-icon-180x180.png",
};
export const metadata: Metadata = {
  title,
  description,
  keywords,
  authors,
  openGraph,
  icons,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
