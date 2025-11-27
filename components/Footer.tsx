import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#05011c]/50 backdrop-blur-md mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} DockyCount. All rights reserved.
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:contact@dockycount.com" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
