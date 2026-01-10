"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export const runtime = "edge";

export default function LiveSearchPage() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim()) {
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    const data = await res.json()
                    setResults(data.list || [])
                } catch (error) {
                    console.error("Search failed", error)
                }
            } else {
                setResults([])
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [query])

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter gradient-text">Live Search</h1>
                    <p className="text-muted-foreground font-medium">Find any YouTube channel instantly.</p>
                </div>

                <div className="relative aura-card p-2 z-50">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                    <input
                        className="w-full bg-transparent border-none outline-none text-xl p-4 pl-14 font-bold placeholder:text-muted-foreground/50"
                        placeholder="Search for a channel..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="space-y-4">
                    {results.map((channel: any) => (
                        <div
                            key={channel[2]}
                            onClick={() => router.push(`/${channel[2]}`)}
                            className="aura-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                        >
                            <img src={channel[3]} alt={channel[0]} className="w-16 h-16 rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">{channel[0]}</h3>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {channel[1]}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
