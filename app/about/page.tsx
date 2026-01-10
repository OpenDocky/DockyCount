import { Shield, Activity, Globe, Layout, Share2, Info, ArrowRight } from "lucide-react"

export const runtime = "edge";

export default function AboutPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="space-y-24">
                {/* Hero Section */}
                <div className="aura-card p-12 md:p-20 relative overflow-hidden bg-gradient-to-br from-background to-secondary/50">
                    <div className="max-w-3xl relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl text-primary text-[10px] font-black uppercase tracking-widest mb-8">
                            <Info className="w-3.5 h-3.5" />
                            <span>Version 19.0.0 "Aura"</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
                            Precision Analytics for <br />
                            <span className="gradient-text">Digital Creators.</span>
                        </h1>

                        <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                            DockyCount is the definitive tool for tracking live YouTube statistics.
                            We built this platform to provide a clean, high-precision interface that bypasses
                            the delays of traditional creator dashboards.
                        </p>
                    </div>

                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                </div>

                {/* Values Section */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="aura-card p-8 border-none bg-secondary/30 space-y-6 group hover:bg-white transition-colors dark:hover:bg-slate-900">
                        <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center soft-shadow group-hover:scale-110 transition-transform">
                            <Activity className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-black">Live Precision</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Our proprietary polling engine delivers sub-second updates, ensuring you never miss a milestone.
                        </p>
                    </div>

                    <div className="aura-card p-8 border-none bg-secondary/30 space-y-6 group hover:bg-white transition-colors dark:hover:bg-slate-900">
                        <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center soft-shadow group-hover:scale-110 transition-transform">
                            <Shield className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-black">Privacy First</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            No fingerprinting. No invasive tracking. Just raw data and public statistics for your transparency.
                        </p>
                    </div>

                    <div className="aura-card p-8 border-none bg-secondary/30 space-y-6 group hover:bg-white transition-colors dark:hover:bg-slate-900">
                        <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center soft-shadow group-hover:scale-110 transition-transform">
                            <Layout className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-black">Next-Gen Stack</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Built with Next.js 15 for lightning-fast server-side logic and fluid animations.
                        </p>
                    </div>

                    <div className="aura-card p-8 border-none bg-secondary/30 space-y-6 group hover:bg-white transition-colors dark:hover:bg-slate-900">
                        <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center soft-shadow group-hover:scale-110 transition-transform">
                            <Globe className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-black">Global Reach</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Access statistics for any channel worldwide with zero geographic restrictions.
                        </p>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center py-20 px-6 aura-card !rounded-[3rem] bg-slate-950 text-white dark:bg-primary/10">
                    <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Ready to start tracking?</h2>
                    <p className="text-slate-400 max-w-xl mx-auto mb-10 font-medium">
                        Join thousands of creators who trust DockyCount for their real-time monitoring.
                    </p>
                    <a href="/" className="aura-btn !rounded-full px-12 py-4 inline-flex items-center gap-3">
                        Launch Monitor
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </div>
        </div>
    )
}
