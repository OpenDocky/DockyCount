import type React from "react"
import type { Metadata } from "next"
import { Outfit, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Footer } from "@/components/Footer"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display"
})
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
})

export const metadata: Metadata = {
  title: "DockyCount | Real-time YouTube Analytics",
  description:
    "Track live YouTube statistics with high precision. Modern, real-time data visualization for creators and curious minds.",
  keywords: [
    "youtube subscriber count",
    "live count",
    "youtube statistics",
    "real-time analytics",
    "dockycount",
  ],
  authors: [{ name: "DockyCount" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} font-sans antialiased bg-black text-white min-h-screen flex flex-col`} suppressHydrationWarning>
        {/* Background Visuals */}
        <div className="bg-orbs">
          <div className="orb-1"></div>
          <div className="orb-2"></div>
        </div>

        <main className="flex-1 relative z-10">
          {children}
        </main>

        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
