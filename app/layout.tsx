import { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import "../styles/globals.css";

const baseURL = "https://tracewell-zeta.vercel.app";
const title = "Tracewell | On-Chain Verified Market Data & AI Analysis";
const description = "On-chain verified market data and traceable AI analysis for Ritual Chain. Signed price and volatility feeds published on-chain via a keeper oracle, interpreted by a Sovereign Agent whose reasoning is recorded on-chain.";
const keywords = ["Tracewell", "Ritual Chain", "crypto market data", "on-chain oracle", "AI agent", "blockchain", "sovereign agent", "price feeds"];
const authors = [{ name: "Tracewell", url: "https://github.com/1nuuu/tracewell" }];
const openGraph = {
  title: "Tracewell | On-Chain Verified Market Data & AI Analysis",
  description: "On-chain verified market data and traceable AI analysis for Ritual Chain.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
