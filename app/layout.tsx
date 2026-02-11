import type React from "react"
import type { Metadata } from "next"
import { Footer } from "@/components/Footer"
import "./globals.css"

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script defer src="https://cloud.umami.is/script.js" data-website-id="44175c92-c5d8-40ca-a25b-b8fb15aa7ab3" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <main className="flex-1 relative">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  )
}
