"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Search, Star, TrendingUp, TrendingDown, Layout, Activity, BarChart3, Globe, ChevronRight, Share2, Info, Copy, Check, Maximize2, Minimize2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams, useRouter, useParams } from "next/navigation"

interface ChannelData {
    id: string
    name: string
    avatar: string
    subscribers: number
    views: number
    videos: number
}

interface Favorite {
    id: string
    name: string
    avatar: string
}

export const dynamic = "force-dynamic"
export const runtime = "edge"

function MilestoneTracker({ current, goal }: { current: number, goal: number }) {
    const progress = Math.min((current / goal) * 100, 100)
    return (
        <div className="space-y-3 mt-8 w-full group">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                <span>Progress to {goal.toLocaleString()}</span>
                <span className="text-primary group-hover:text-primary/80 transition-colors">{progress.toFixed(4)}%</span>
            </div>
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden shadow-inner border border-border/50 relative">
                <div
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                </div>
            </div>
            <div className="flex justify-between items-center">
                <div className="text-[10px] text-muted-foreground/60 font-medium">
                    {(goal - current).toLocaleString()} remaining
                </div>
                <div className="text-[10px] text-primary/60 font-medium">
                    Goal: {goal.toLocaleString()}
                </div>
            </div>
        </div>
    )
}

function getNextMilestone(subscribers: number) {
    if (subscribers < 100) return 100
    if (subscribers < 1000) return 1000
    if (subscribers < 10000) return 10000
    if (subscribers < 100000) return 100000
    if (subscribers < 1000000) return 1000000
    if (subscribers < 10000000) return 10000000
    return Math.ceil(subscribers / 10000000) * 10000000 + 10000000
}

function DockyCount() {
    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchQuery2, setSearchQuery2] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchResults2, setSearchResults2] = useState<any[]>([])
    const [selectedChannel, setSelectedChannel] = useState<ChannelData | null>(null)
    const [compareChannel, setCompareChannel] = useState<ChannelData | null>(null)
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [compareMode, setCompareMode] = useState(false)
    const [usageTime, setUsageTime] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [subGap, setSubGap] = useState<number | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const compareIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const usageIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const odometerLoadedRef = useRef(false)
    const odometerRefs = useRef<{ [key: string]: any }>({})

    // --- Helper Functions Definitions (BEFORE useEffect) ---

    const fetchChannelStats = async (channelId: string, isCompare = false) => {
        try {
            const response = await fetch(`/api/stats/${channelId}`)
            const data = await response.json()
            if (data && data.items && data.items.length > 0) {
                const item = data.items[0]
                const channelData: ChannelData = {
                    id: channelId,
                    name: item.snippet.title,
                    avatar: item.snippet.thumbnails.default.url,
                    subscribers: Number.parseInt(item.statistics.subscriberCount),
                    views: Number.parseInt(item.statistics.viewCount),
                    videos: Number.parseInt(item.statistics.videoCount),
                }
                if (isCompare) {
                    setCompareChannel(channelData)
                } else {
                    setSelectedChannel(channelData)
                }
            }
        } catch (error) {
            console.error("Error fetching stats:", error)
        }
    }

    const updateOdometer = (id: string, value: number) => {
        const element = document.getElementById(id)
        if (element && typeof window !== "undefined" && (window as any).Odometer) {
            // Check if we already have an instance for this ID
            if (!odometerRefs.current[id] || odometerRefs.current[id].el !== element) {
                // Initialize new odometer
                odometerRefs.current[id] = new (window as any).Odometer({
                    el: element,
                    value: value,
                    format: "(,ddd)",
                    theme: "default",
                    duration: 500
                })
            } else {
                odometerRefs.current[id].update(value)
            }
        } else if (element) {
            element.textContent = value.toLocaleString()
        }
    }

    const searchChannels = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }
        setIsSearching(true)
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
            const data = await response.json()
            if (data && data.list && data.list.length > 0) {
                setSearchResults(data.list.slice(0, 5))
            } else {
                setSearchResults([])
            }
        } catch (error) {
            console.error("Search error:", error)
        } finally {
            setIsSearching(false)
        }
    }

    const searchChannels2 = async (query: string) => {
        if (!query.trim()) {
            setSearchResults2([])
            return
        }
        setIsSearching(true)
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
            const data = await response.json()
            if (data && data.list && data.list.length > 0) {
                setSearchResults2(data.list.slice(0, 5))
            } else {
                setSearchResults2([])
            }
        } catch (error) {
            console.error("Search error:", error)
        } finally {
            setIsSearching(false)
        }
    }

    const selectChannel = async (result: any, isCompare = false) => {
        const channelId = result[2]
        if (!isCompare) {
            router.push(`/${channelId}`)
            setSearchResults([])
            setSearchQuery("")
            return
        }
        if (isCompare) {
            if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
            fetchChannelStats(channelId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchChannelStats(channelId, true)
            }, 2000)
        }
        setSearchResults2([])
        setSearchQuery2("")
    }

    const toggleFavorite = (channel: ChannelData) => {
        const isFavorite = favorites.some((f) => f.id === channel.id)
        let newFavorites: Favorite[]
        if (isFavorite) {
            newFavorites = favorites.filter((f) => f.id !== channel.id)
        } else {
            newFavorites = [...favorites, { id: channel.id, name: channel.name, avatar: channel.avatar }]
        }
        setFavorites(newFavorites)
        localStorage.setItem("dockycount_favorites", JSON.stringify(newFavorites))
        toast({
            title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
            description: isFavorite ? `${channel.name} removed` : `${channel.name} saved`,
        })
    }

    const copyToClipboard = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href)
            toast({
                title: "Link Copied!",
                description: "Share the stats with everyone.",
            })
        }
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullscreen(false)
            }
        }
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${minutes}m ${secs}s`
    }

    // --- useEffects (AFTER function definitions) ---

    useEffect(() => {
        setMounted(true)
        if (typeof window !== "undefined") {
            const savedFavorites = localStorage.getItem("dockycount_favorites")
            if (savedFavorites) {
                try {
                    setFavorites(JSON.parse(savedFavorites))
                } catch (e) {
                    console.error("Failed to parse favorites:", e)
                }
            }
        }

        usageIntervalRef.current = setInterval(() => {
            setUsageTime(prev => prev + 1)
        }, 1000)

        return () => {
            if (usageIntervalRef.current) clearInterval(usageIntervalRef.current)
        }
    }, [])

    useEffect(() => {
        const idFromPath = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
        const idFromSearch = searchParams.get("id")
        const channelId = idFromPath || idFromSearch

        if (channelId && typeof channelId === "string" && channelId.startsWith("UC")) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            fetchChannelStats(channelId, false)
            intervalRef.current = setInterval(() => {
                fetchChannelStats(channelId, false)
            }, 2000)
        }
    }, [params.id, searchParams])

    useEffect(() => {
        if (typeof window !== "undefined" && !odometerLoadedRef.current) {
            const script = document.createElement("script")
            script.src = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/odometer.min.js"
            script.async = true
            document.body.appendChild(script)

            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/themes/odometer-theme-default.css"
            document.head.prepend(link)

            odometerLoadedRef.current = true
        }

        // Force CSS for Odometer
        const style = document.createElement('style')
        style.innerHTML = `
            .odometer.odometer-auto-theme, .odometer.odometer-theme-default {
                display: inline-block;
                vertical-align: middle;
                *vertical-align: auto;
                *zoom: 1;
                *display: inline;
                position: relative;
                white-space: nowrap !important;
            }
            .odometer.odometer-auto-theme .odometer-digit, .odometer.odometer-theme-default .odometer-digit {
                display: inline-block !important;
                vertical-align: middle;
            }
            .odometer.odometer-auto-theme .odometer-digit .odometer-digit-spacer, .odometer.odometer-theme-default .odometer-digit .odometer-digit-spacer {
                display: inline-block !important;
                vertical-align: middle;
            }
            .odometer.odometer-auto-theme .odometer-digit .odometer-digit-inner, .odometer.odometer-theme-default .odometer-digit .odometer-digit-inner {
                display: block;
            }
        `
        document.head.appendChild(style)
        return () => {
            try { document.head.removeChild(style) } catch (e) { }
        }
    }, [])

    useEffect(() => {
        if (selectedChannel) {
            // Small delay to ensure DOM is ready if switching modes
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedChannel.subscribers)
                updateOdometer("main-views", selectedChannel.views)
                updateOdometer("main-videos", selectedChannel.videos)
            }, 50)
        }
    }, [selectedChannel, compareMode])

    useEffect(() => {
        if (compareChannel) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareChannel.subscribers)
                updateOdometer("compare-views", compareChannel.views)
                updateOdometer("compare-videos", compareChannel.videos)
            }, 50)
        }
    }, [compareChannel, compareMode])

    useEffect(() => {
        if (selectedChannel && compareChannel) {
            const diff = Math.abs(selectedChannel.subscribers - compareChannel.subscribers)
            setSubGap(selectedChannel.subscribers - compareChannel.subscribers)
            setTimeout(() => {
                updateOdometer("gap-difference", diff)
            }, 50)
        } else {
            setSubGap(null)
        }
    }, [selectedChannel, compareChannel])

    useEffect(() => {
        const compareId = searchParams.get("compare")
        if (compareId && !compareMode) {
            setCompareMode(true)
            fetchChannelStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchChannelStats(compareId, true)
            }, 2000)
        }
    }, [searchParams])

    useEffect(() => {
        const timer = setTimeout(() => {
            searchChannels(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        const timer = setTimeout(() => {
            searchChannels2(searchQuery2)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery2])


    if (!mounted) return null

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Toaster />

            <nav className="glass-nav px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter gradient-text cursor-pointer" onClick={() => router.push('/')}>DockyCount <span className="text-xs align-top opacity-50 font-normal">PRO</span></span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            Live System
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full text-[10px] font-bold text-muted-foreground border border-border/50">
                            <Activity className="w-3 h-3 text-primary" />
                            {formatTime(usageTime)}
                        </div>
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="rounded-full w-9 h-9">
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </nav>

            <div className="border-b border-yellow-200/80 bg-yellow-100/70">
                <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] font-semibold">
                    <div className="flex items-center gap-2 text-yellow-900">
                        <Info className="w-4 h-4 text-green-700" />
                        <span>DockyCount closure postponed until March 19</span>
                    </div>
                    <Button asChild variant="secondary" size="sm" className="rounded-full h-7 px-3 text-[11px]">
                        <a
                            href="https://drayko.xyz/news/cHwU15AvkMigxOgMDHcV"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Learn more
                        </a>
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Sidebar / Favorites */}
                    <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">
                        <div className="aura-card p-5 bg-card/50 backdrop-blur-sm border border-border/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5 text-primary fill-primary/20" />
                                    Favorites
                                </h3>
                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{favorites.length}</span>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {favorites.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground/40 border border-dashed border-border/50 rounded-xl">
                                        <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center mx-auto mb-2">
                                            <Globe className="w-5 h-5 opacity-50" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide">Empty List</p>
                                    </div>
                                ) : (
                                    favorites.map((fav) => (
                                        <button
                                            key={fav.id}
                                            onClick={() => router.push(`/${fav.id}`)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-secondary/80 rounded-xl transition-all group"
                                        >
                                            <img src={fav.avatar} alt={fav.name} className="w-8 h-8 rounded-lg shadow-sm" />
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="text-xs font-bold truncate group-hover:text-primary transition-colors">{fav.name}</div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="aura-card p-5 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                    <Info className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Pro Features</h4>
                            </div>
                            <ul className="space-y-2 text-[10px] font-medium text-muted-foreground/80">
                                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Real-time WebSocket</li>
                                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Sub-second Updates</li>
                                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-green-500" /> Comparison Engine</li>
                            </ul>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-9 space-y-8 order-1 lg:order-2">
                        {/* Search & Mode Toggle */}
                        <div className="aura-card p-6 bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5 relative z-50">
                            <div className="flex gap-2 mb-6 p-1 bg-secondary/50 rounded-2xl w-fit">
                                <button
                                    onClick={() => setCompareMode(false)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!compareMode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Layout className="w-3.5 h-3.5 inline-block mr-2 mb-0.5" />
                                    Single View
                                </button>
                                <button
                                    onClick={() => setCompareMode(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${compareMode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <BarChart3 className="w-3.5 h-3.5 inline-block mr-2 mb-0.5" />
                                    Compare
                                </button>
                            </div>

                            <div className="relative">
                                {!compareMode ? (
                                    <div className="relative group">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search YouTube channel..."
                                            className="aura-input !pl-14 h-14 text-base w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Channel 1..."
                                                className="aura-input !pl-12 h-12 text-sm w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                            <input
                                                value={searchQuery2}
                                                onChange={(e) => setSearchQuery2(e.target.value)}
                                                placeholder="Channel 2..."
                                                className="aura-input !pl-12 h-12 text-sm w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Search Dropdown */}
                                {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                                    <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-[100] rounded-2xl shadow-2xl p-2 bg-background/95 backdrop-blur-xl border border-border/80 animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={`s1-${index}`}
                                                onClick={() => selectChannel(result, false)}
                                                className="w-full flex items-center gap-4 p-3 hover:bg-secondary rounded-xl text-left transition-colors group"
                                            >
                                                <img src={result[3]} className="w-10 h-10 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold text-sm truncate">{result[0]}</div>
                                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{result[1]}</div>
                                                </div>
                                            </button>
                                        ))}
                                        {compareMode && searchResults2.length > 0 && <div className="h-px bg-border my-2" />}
                                        {compareMode && searchResults2.map((result, index) => (
                                            <button
                                                key={`s2-${index}`}
                                                onClick={() => selectChannel(result, true)}
                                                className="w-full flex items-center gap-4 p-3 hover:bg-secondary rounded-xl text-left transition-colors group"
                                            >
                                                <img src={result[3]} className="w-10 h-10 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform border border-primary/20" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold text-sm truncate text-primary">{result[0]}</div>
                                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{result[1]}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Display */}
                        {selectedChannel ? (
                            <div className="space-y-8">
                                <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>

                                    {/* Channel 1 */}
                                    <div className="aura-card p-8 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                            <img src={selectedChannel.avatar} className="w-32 h-32 rounded-3xl relative z-10 shadow-2xl border-4 border-background group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute -bottom-3 -right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg z-20 animate-pulse">
                                                Live
                                            </div>
                                        </div>

                                        <h2 className="text-3xl font-black mb-1 leading-tight">{selectedChannel.name}</h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">{selectedChannel.id}</p>

                                        <div className="flex gap-3 mb-8">
                                            <Button variant="outline" size="sm" onClick={() => toggleFavorite(selectedChannel)} className="rounded-full h-8 px-4 text-xs font-bold gap-2">
                                                <Star className={`w-3.5 h-3.5 ${favorites.some(f => f.id === selectedChannel.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                                {favorites.some(f => f.id === selectedChannel.id) ? 'Saved' : 'Save'}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-full h-8 w-8 p-0">
                                                <Share2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <div className="w-full py-8 bg-secondary/20 rounded-3xl border border-border/50 mb-6 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-grid-white/5 mask-image-b" />
                                            <div className="relative z-10">
                                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-2">Total Subscribers</div>
                                                <div id="main-subscribers" key={`main-subscribers-${compareMode}`} className={`font-black tabular-nums tracking-tighter leading-none whitespace-nowrap ${compareMode ? 'text-5xl lg:text-6xl' : 'text-7xl lg:text-8xl'}`}>
                                                </div>
                                            </div>
                                        </div>

                                        <MilestoneTracker current={selectedChannel.subscribers} goal={getNextMilestone(selectedChannel.subscribers)} />

                                        <div className="grid grid-cols-2 w-full gap-4 mt-8 pt-8 border-t border-border/50">
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Views</div>
                                                <div id="main-views" key={`main-views-${compareMode}`} className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Videos</div>
                                                <div id="main-videos" key={`main-videos-${compareMode}`} className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Channel 2 */}
                                    {compareMode && compareChannel && (
                                        <div className="aura-card p-8 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
                                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                                <img src={compareChannel.avatar} className="w-32 h-32 rounded-3xl relative z-10 shadow-2xl border-4 border-background group-hover:scale-105 transition-transform duration-500" />
                                            </div>

                                            <h2 className="text-3xl font-black mb-1 leading-tight">{compareChannel.name}</h2>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">{compareChannel.id}</p>

                                            <div className="flex gap-3 mb-8">
                                                <Button variant="outline" size="sm" onClick={() => toggleFavorite(compareChannel)} className="rounded-full h-8 px-4 text-xs font-bold gap-2">
                                                    <Star className={`w-3.5 h-3.5 ${favorites.some(f => f.id === compareChannel.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                                    {favorites.some(f => f.id === compareChannel.id) ? 'Saved' : 'Save'}
                                                </Button>
                                            </div>

                                            <div className="w-full py-8 bg-secondary/20 rounded-3xl border border-border/50 mb-6 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-grid-white/5 mask-image-b" />
                                                <div className="relative z-10">
                                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-2">Total Subscribers</div>
                                                    <div id="compare-subscribers" key="compare-subscribers" className="text-5xl lg:text-6xl font-black tabular-nums tracking-tighter leading-none text-primary whitespace-nowrap">
                                                    </div>
                                                </div>
                                            </div>

                                            <MilestoneTracker current={compareChannel.subscribers} goal={getNextMilestone(compareChannel.subscribers)} />

                                            <div className="grid grid-cols-2 w-full gap-4 mt-8 pt-8 border-t border-border/50">
                                                <div>
                                                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Views</div>
                                                    <div id="compare-views" className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Videos</div>
                                                    <div id="compare-videos" className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comparison Analytics Header */}
                                {compareMode && selectedChannel && compareChannel && subGap !== null && (
                                    <div className="aura-card p-8 bg-gradient-to-br from-card to-secondary/20 border-primary/10 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
                                            <Activity className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-[0.3em]">Gap Analysis</span>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                                            <div className="text-center">
                                                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Subscriber Difference</div>
                                                <div className="text-5xl md:text-6xl font-black tracking-tighter tabular-nums flex items-center justify-center gap-3 whitespace-nowrap">
                                                    {subGap > 0 ? <TrendingUp className="w-8 h-8 text-green-500" /> : <TrendingDown className="w-8 h-8 text-red-500" />}
                                                    <div id="gap-difference"></div>
                                                </div>
                                                <div className="mt-2 text-xs font-bold bg-primary/10 text-primary py-1 px-3 rounded-full inline-block">
                                                    {subGap > 0 ? `${selectedChannel.name} leads` : `${compareChannel.name} leads`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Welcome / Empty State
                            <div className="aura-card p-12 text-center flex flex-col items-center justify-center h-[500px] border-dashed border-2 border-border/50 bg-secondary/5">
                                <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                    <BarChart3 className="w-10 h-10 text-primary relative z-10" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Start Monitoring</h2>
                                <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
                                    Search for any YouTube channel above to see real-time statistics, future projections, and detailed comparisons.
                                </p>
                                <div className="flex gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}

export default function DockyCountPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing System</div>
                </div>
            </div>
        }>
            <DockyCount />
        </Suspense>
    )
}
