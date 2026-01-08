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
  title: "DockyCount | Advanced YouTube Analytics",
  description:
    "Monitor live YouTube statistics with unparalleled precision. The most elegant, real-time data visualization platform for digital creators.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} font-sans antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <main className="flex-1 relative">
          {children}
        </main>

        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
