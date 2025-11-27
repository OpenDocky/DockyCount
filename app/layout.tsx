import type React from "react"
import type { Metadata } from "next"
import { Outfit, Roboto } from "next/font/google"
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
  title: "DockyCount - YouTube Real-Time Counter",
  description: "Track YouTube subscribers in real-time with premium analytics.",
  generator: "v0.app",
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
      </body>
    </html>
  )
}
