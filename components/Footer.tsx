import Link from "next/link"

export function Footer() {
  return (
    <footer className="relative border-t border-purple-500/20 bg-gradient-to-br from-[#170c2b]/80 via-[#0a0118]/90 to-[#1a0f2e]/80 backdrop-blur-xl mt-auto overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5 opacity-50"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/30">
                DC
              </div>
              <span className="font-semibold text-white">DockyCount</span>
            </div>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} DockyCount. All rights reserved.
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group"
            >
              <span className="relative">
                About Us
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
            <Link
              href="/privacy"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group"
            >
              <span className="relative">
                Privacy Policy
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
            <Link
              href="/terms"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group"
            >
              <span className="relative">
                Terms of Service
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
            <Link
              href="/contact"
              className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110 relative group"
            >
              <span className="relative">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></span>
              </span>
            </Link>
          </nav>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-purple-500/10 text-center">
          <p className="text-xs text-gray-500">
            Real-time YouTube statistics powered by{" "}
            <span className="text-purple-400">Mixerno API</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
