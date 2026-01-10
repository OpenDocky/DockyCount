"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Search, Star, LogOut, TrendingUp, TrendingDown, Users, Eye, Video, X, Layout, Activity, BarChart3, Globe, Shield, ChevronRight, Share2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import Link from "next/link"

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
        <div className="space-y-3 mt-8 w-full">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                <span>Progress to {goal.toLocaleString()}</span>
                <span className="text-primary">{progress.toFixed(2)}%</span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner border border-border/50">
                <div
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="text-[10px] text-muted-foreground/60 text-center font-medium">
                {(goal - current).toLocaleString()} subscribers remaining to milestone
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
    const [user, setUser] = useState<any | null>(null)
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
    const [showLimitOverlay, setShowLimitOverlay] = useState(false)

    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const compareIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const usageIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const odometerLoadedRef = useRef(false)

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
    }, [])

    useEffect(() => {
        if (selectedChannel) {
            updateOdometer("main-subscribers", selectedChannel.subscribers)
            updateOdometer("main-views", selectedChannel.views)
            updateOdometer("main-videos", selectedChannel.videos)
        }
    }, [selectedChannel])

    useEffect(() => {
        if (compareChannel) {
            updateOdometer("compare-subscribers", compareChannel.subscribers)
            updateOdometer("compare-views", compareChannel.views)
            updateOdometer("compare-videos", compareChannel.videos)
        }
    }, [compareChannel])

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
            if (!(element as any).odometer) {
                ; (element as any).odometer = new (window as any).Odometer({
                    el: element,
                    value: 0,
                    format: "(,ddd)",
                    theme: "default",
                })
            }
            ; (element as any).odometer.update(value)
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
            description: `Saved locally`,
        })
    }

    const handleSignIn = () => {
        toast({
            title: "Auth Disabled",
            description: "Google Sign-In is temporarily disabled. Favorites are saved locally.",
        })
    }

    const handleSignOut = () => {
        setUser(null)
        setFavorites([])
        localStorage.removeItem("dockycount_favorites")
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${minutes}m ${secs}s`
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <Toaster />
            {showLimitOverlay && (
                <div className="fixed inset-0 bg-background/90 z-[100] flex items-center justify-center p-6 backdrop-blur-xl">
                    <div className="aura-card max-w-md w-full p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                            <Activity className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black">Daily Limit Reached</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You've reached the 1-hour daily monitoring limit for this session.
                        </p>
                        <Button onClick={() => window.location.reload()} variant="default" className="aura-btn w-full">
                            Refresh Session
                        </Button>
                    </div>
                </div>
            )}

            <nav className="glass-nav px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter gradient-text">DockyCount v19</span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live Network
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary rounded-2xl text-xs font-bold text-muted-foreground">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            {formatTime(usageTime)} active
                        </div>
                        <button onClick={handleSignIn} className="aura-btn opacity-50 cursor-not-allowed" disabled>
                            Sign In (Disabled)
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-12 gap-10">
                    <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">
                        <div className="aura-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Star className="w-4 h-4 text-primary" />
                                    Favorites
                                </h3>
                                <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full">{favorites.length}</span>
                            </div>
                            <div className="space-y-3">
                                {favorites.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground/40">
                                        <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-tighter">No favorites</p>
                                    </div>
                                ) : (
                                    favorites.map((fav) => (
                                        <button
                                            key={fav.id}
                                            onClick={() => router.push(`/${fav.id}`)}
                                            className="w-full flex items-center gap-3 p-3 aura-card !bg-transparent hover:!bg-secondary border-none"
                                        >
                                            <img src={fav.avatar} alt={fav.name} className="w-8 h-8 rounded-lg" />
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="text-xs font-bold truncate">{fav.name}</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="lg:col-span-9 space-y-10 order-1 lg:order-2">
                        <div className="aura-card p-8 relative z-50">
                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <button
                                    onClick={() => setCompareMode(false)}
                                    className={`flex-1 aura-btn !rounded-2xl ${compareMode ? 'aura-btn-secondary' : ''}`}
                                >
                                    <Layout className="w-4 h-4 mr-2" />
                                    Single View
                                </button>
                                <button
                                    onClick={() => setCompareMode(true)}
                                    className={`flex-1 aura-btn !rounded-2xl ${!compareMode ? 'aura-btn-secondary' : ''}`}
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Compare Mode
                                </button>
                            </div>

                            <div className="relative">
                                {!compareMode ? (
                                    <div className="relative">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground z-20" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search YouTube channel..."
                                            className="aura-input !pl-16 pr-6 h-16 text-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-20" />
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Channel 1..."
                                                className="aura-input !pl-14 h-14 text-sm"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-20" />
                                            <input
                                                value={searchQuery2}
                                                onChange={(e) => setSearchQuery2(e.target.value)}
                                                placeholder="Channel 2..."
                                                className="aura-input !pl-14 h-14 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                                    <div className="absolute top-[calc(100%+0.75rem)] left-0 right-0 z-[100] rounded-3xl shadow-2xl p-2 bg-background border border-border">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={`s1-${index}`}
                                                onClick={() => selectChannel(result, false)}
                                                className="w-full flex items-center gap-4 p-4 hover:bg-secondary rounded-2xl text-left"
                                            >
                                                <img src={result[3]} className="w-12 h-12 rounded-xl object-cover" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold truncate">{result[0]}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">{result[1]}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedChannel && (
                            <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-8`}>
                                <div className="aura-card p-10 flex flex-col items-center text-center">
                                    <img src={selectedChannel.avatar} className="w-28 h-28 rounded-3xl mb-4" />
                                    <h2 className="text-3xl font-black mb-4">{selectedChannel.name}</h2>
                                    <div className="flex gap-4 mb-8">
                                        <button onClick={() => toggleFavorite(selectedChannel)}>
                                            <Star className={`w-5 h-5 ${favorites.some(f => f.id === selectedChannel.id) ? 'fill-primary text-primary' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="w-full space-y-2">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground">Subscribers</div>
                                        <div id="main-subscribers" className="text-7xl font-black tabular-nums">0</div>
                                    </div>
                                    <MilestoneTracker current={selectedChannel.subscribers} goal={getNextMilestone(selectedChannel.subscribers)} />
                                </div>
                                {compareMode && compareChannel && (
                                    <div className="aura-card p-10 flex flex-col items-center text-center">
                                        <img src={compareChannel.avatar} className="w-28 h-28 rounded-3xl mb-4" />
                                        <h2 className="text-3xl font-black mb-4">{compareChannel.name}</h2>
                                        <div className="w-full space-y-2">
                                            <div className="text-[10px] font-black uppercase text-muted-foreground">Subscribers</div>
                                            <div id="compare-subscribers" className="text-7xl font-black tabular-nums text-primary">0</div>
                                        </div>
                                        <MilestoneTracker current={compareChannel.subscribers} goal={getNextMilestone(compareChannel.subscribers)} />
                                    </div>
                                )}
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
        <Suspense fallback={<div>Loading...</div>}>
            <DockyCount />
        </Suspense>
    )
}
