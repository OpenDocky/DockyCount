import Link from "next/link"
import { Activity } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-primary/10 bg-black/60 backdrop-blur-md mt-auto overflow-hidden py-12">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">

          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="px-2 py-0.5 border border-primary text-[10px] text-primary font-black tracking-widest uppercase">
                NODE_FOOTER
              </div>
              <span className="font-black text-white tracking-widest uppercase text-xl neon-text">SYS_STATS</span>
            </div>
            <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
              // NEURAL_LINK_SECURE_CHANNEL // © {new Date().getFullYear()}
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-8 text-[10px] font-black tracking-[0.2em] uppercase">
            <Link
              href="/privacy"
              className="text-white/40 hover:text-primary transition-all duration-300 relative group"
            >
              PRIVACY_PROTOCOLS
            </Link>
            <Link
              href="/terms"
              className="text-white/40 hover:text-primary transition-all duration-300 relative group"
            >
              USAGE_POLICY
            </Link>
            <Link
              href="/contact"
              className="text-white/40 hover:text-primary transition-all duration-300 relative group"
            >
              DIRECT_LINK_ADMIN
            </Link>
          </nav>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] text-white/20 font-mono">
            <Activity className="w-3 h-3 text-primary animate-pulse" />
            UPLINK_STABLE // MIXERNO_CORE_SYNC
          </div>
          <div className="text-[9px] text-white/10 uppercase tracking-widest font-bold">
            Data streams are subject to neural decryption delays
          </div>
        </div>
      </div>
    </footer>
  )
}
