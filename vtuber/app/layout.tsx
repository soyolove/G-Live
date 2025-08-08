import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live2D Viewer",
  description: "Interactive Live2D model viewer with SSE control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/lib/live2dcubismcore.min.js"
          strategy="beforeInteractive"
        />
        {/* <Script
          src="https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/lib/pixi-live2d-display.min.js"
          strategy="beforeInteractive"
        /> */}
        {/* <Script
          src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js"
          strategy="beforeInteractive"
        /> */}
        {children}
      </body>
    </html>
  );
}
