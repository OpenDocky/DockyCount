import type React from "react"
import type { Metadata } from "next"
import { Outfit, Roboto } from "next/font/google"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { Footer } from "@/components/Footer"
import "./globals.css"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" })
const robotoBlack = Roboto({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-roboto-black",
})

export const metadata: Metadata = {
  title: "DockyCount - Real-Time YouTube Channel Statistics & Subscriber Counter",
  description:
    "Track YouTube channel statistics in real-time with DockyCount. Monitor subscriber counts, video views, and compare channels with live updates every 2 seconds. Free YouTube analytics tool.",
  keywords: [
    "youtube subscriber count",
    "youtube statistics",
    "real-time youtube counter",
    "youtube analytics",
    "channel comparison",
    "youtube tracker",
    "live subscriber count",
  ],
  authors: [{ name: "DockyCount" }],
  creator: "DockyCount",
  publisher: "DockyCount",
  robots: "index, follow",
  openGraph: {
    title: "DockyCount - Real-Time YouTube Channel Statistics",
    description: "Track YouTube subscribers, views, and videos in real-time. Compare channels and save favorites.",
    type: "website",
    locale: "en_US",
    siteName: "DockyCount",
  },
  twitter: {
    card: "summary_large_image",
    title: "DockyCount - Real-Time YouTube Statistics",
    description: "Track YouTube channel stats in real-time with premium analytics.",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  generator: "v0.app",
  other: {
    "google-adsense-account": "ca-pub-3145023750951462",
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${robotoBlack.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <Analytics />
        {/* PotatoShield Anti-Adblock */}
        <Script
          src="https://cdn.jsdelivr.net/gh/AelMartins/potatoshield@v1.0.0/dist/potatoshield.min.ob.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
