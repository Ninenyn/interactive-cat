import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Jew & Bo — A little company",
  description:
    "A quiet little room with Jew the black cat and Bo the golden retriever. Stay a moment, share a little affection, and discover a heart note.",
  applicationName: "Jew & Bo",
  appleWebApp: {
    capable: true,
    title: "Jew & Bo",
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141b20" },
    { media: "(prefers-color-scheme: light)", color: "#f1e8d8" },
  ],
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
