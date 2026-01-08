import Link from "next/link"
import { Activity, Github, Twitter, Globe } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-16 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter gradient-text">DockyCount</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                v19.0.0 "Aura" Edition
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Providing precision analytics for the modern YouTube ecosystem.
              Our platform delivers real-time data with higher fidelity than traditional dashboards.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
                <Github className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="#" className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Platform</h4>
            <nav className="flex flex-col gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link>
              <a href="/live-search" className="text-sm text-muted-foreground hover:text-primary transition-colors">Live Search</a>
              <a href="/api-access" className="text-sm text-muted-foreground hover:text-primary transition-colors">API Access</a>
              <a href="/compare" className="text-sm text-muted-foreground hover:text-primary transition-colors">Comparison Tool</a>
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Legal & Privacy</h4>
            <nav className="flex flex-col gap-4">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Support</Link>
            </nav>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-muted-foreground font-medium">
            © {new Date().getFullYear()} DockyCount. All rights reserved.
          </p>
          <div className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-full">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
              Uplink Active: Stable
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
