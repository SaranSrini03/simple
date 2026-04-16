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
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (() => {
              const savedTheme = localStorage.getItem("theme");
              const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const theme = savedTheme === "dark" || savedTheme === "light"
                ? savedTheme
                : (systemDark ? "dark" : "light");
              document.documentElement.setAttribute("data-theme", theme);
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
