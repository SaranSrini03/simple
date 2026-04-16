import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Evaluation Dashboard",
  description: "Team-wise evaluation cards and analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (() => {
              const s = localStorage.getItem("theme");
              const d = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const t = s === "dark" || s === "light" ? s : (d ? "dark" : "light");
              document.documentElement.setAttribute("data-theme", t);
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
