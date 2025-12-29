"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { initializeApp } from "firebase/app"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Star, LogOut, TrendingUp, TrendingDown, Users, Eye, Video, X, Lock, Cpu, Zap, Activity, HardDrive, Shield, BarChart3, Terminal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"
import { useSearchParams, useRouter, useParams } from "next/navigation"

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjmXMMafuPYkYi1GzrnucNJSjxypN2gYQ",
    authDomain: "docky-dev-fr.firebaseapp.com",
    projectId: "docky-dev-fr",
    storageBucket: "docky-dev-fr.firebasestorage.app",
    messagingSenderId: "548202839817",
    appId: "1:548202839817:web:832f713ae5135e41809dd8",
    measurementId: "G-KLXHVFYQYY",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

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

function DockyCount() {
    const [mounted, setMounted] = useState(false)
    const [user, setUser] = useState<User | null>(null)
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
    const [hasSupported, setHasSupported] = useState(false)
    const [pendingChannel, setPendingChannel] = useState<{ result: any; isCompare: boolean } | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Anti-bypass Security v2 - Custom Hashing
    const getVerificationToken = (id: string, timestamp: number) => {
        const salt = "D0cky_X_Private_Key_v2_2025"
        const data = `${id}|${timestamp}|${salt}`

        // Custom simple hash function to make it hard to guess
        let hash = 0
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }

        // Return as a unique base36 string
        return Math.abs(hash).toString(36).toUpperCase()
    }

    const shortenWithCuty = (channelId: string) => {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        const baseDomain = isLocal ? "https://dockycount.vercel.app" : window.location.origin

        // Add current timestamp to the token
        const now = Date.now()
        const token = getVerificationToken(channelId, now)
        const targetUrl = `${baseDomain}/${channelId}?v=${token}&t=${now}`

        const cutyToken = "6dfe7702a2e261bfe04f6bad2"
        return `https://cuty.io/quick?token=${cutyToken}&url=${encodeURIComponent(targetUrl)}`
    }

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const compareIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const usageIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const odometerLoadedRef = useRef(false)
    const authorizedChannelRef = useRef<string | null>(null)

    // Load channel from Path or Search on mount
    useEffect(() => {
        const idFromPath = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
        const idFromSearch = searchParams.get("id")
        const channelId = idFromPath || idFromSearch
        const vToken = searchParams.get("v")
        const tParam = searchParams.get("t")

        if (channelId && typeof channelId === "string" && channelId.startsWith("UC")) {
            // Check if we already authorized this channel in this session
            if (authorizedChannelRef.current === channelId) {
                setHasSupported(true)
                if (intervalRef.current) clearInterval(intervalRef.current)
                fetchChannelStats(channelId, false)
                intervalRef.current = setInterval(() => {
                    fetchChannelStats(channelId, false)
                }, 2000)
                return
            }

            const timestamp = parseInt(tParam || "0")
            const now = Date.now()

            // Allow 5 minutes window and handle slight clock drift (Math.abs)
            const fiveMinutes = 5 * 60 * 1000
            const expectedToken = getVerificationToken(channelId, timestamp)
            const isTimeValid = !isNaN(timestamp) && timestamp > 0 && Math.abs(now - timestamp) < fiveMinutes
            const isTokenValid = vToken === expectedToken

            const isAlreadyUsed = vToken ? sessionStorage.getItem(`used_${vToken}`) : false

            if (isTokenValid && isTimeValid && !isAlreadyUsed) {
                setHasSupported(true)
                authorizedChannelRef.current = channelId // Lock in memory

                if (vToken) sessionStorage.setItem(`used_${vToken}`, "true")

                // Only clean URL if we actually arrived with tokens
                if (vToken || tParam) {
                    const newUrl = `/${channelId}`
                    window.history.replaceState({}, "", newUrl)
                }

                if (intervalRef.current) clearInterval(intervalRef.current)
                fetchChannelStats(channelId, false)
                intervalRef.current = setInterval(() => {
                    fetchChannelStats(channelId, false)
                }, 2000)
            } else {
                setHasSupported(false)
                fetchChannelStats(channelId, false)

                if (vToken && (!isTokenValid || !isTimeValid || isAlreadyUsed)) {
                    toast({
                        title: "Accès Refusé",
                        description: isAlreadyUsed ? "Lien déjà utilisé." : "Clé invalide ou expirée.",
                        variant: "destructive"
                    })
                }
            }
        }
    }, [params.id, searchParams])
    // Reduced dependencies to avoid unnecessary re-runs

    useEffect(() => {
        if (typeof window !== "undefined" && !odometerLoadedRef.current) {
            const script = document.createElement("script")
            script.src = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/odometer.min.js"
            script.async = true
            document.body.appendChild(script)
            odometerLoadedRef.current = true
        }
    }, [])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser)
            if (currentUser) {
                await loadUserFavorites(currentUser.uid)
            } else {
                setFavorites([])
            }
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const savedTime = localStorage.getItem("dockycount_usage_time")
        const savedDate = localStorage.getItem("dockycount_usage_date")
        const today = new Date().toDateString()

        if (savedDate !== today) {
            localStorage.setItem("dockycount_usage_time", "0")
            localStorage.setItem("dockycount_usage_date", today)
            setUsageTime(0)
        } else {
            setUsageTime(Number.parseInt(savedTime || "0"))
        }

        usageIntervalRef.current = setInterval(() => {
            setUsageTime((prev) => {
                const newTime = prev + 1
                localStorage.setItem("dockycount_usage_time", newTime.toString())
                if (newTime >= 3600) {
                    setShowLimitOverlay(true)
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
                }
                return newTime
            })
        }, 1000)

        return () => {
            if (usageIntervalRef.current) clearInterval(usageIntervalRef.current)
        }
    }, [])

    const loadUserFavorites = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid))
            if (userDoc.exists()) {
                const data = userDoc.data()
                setFavorites(data.favorites || [])
            }
        } catch (error) {
            console.error("Error loading favorites:", error)
        }
    }

    const saveFavorites = async (newFavorites: Favorite[]) => {
        if (!user) return
        try {
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                favorites: newFavorites,
            })
        } catch (error) {
            console.error("Error saving favorites:", error)
            toast({
                title: "Error",
                description: "Unable to save favorites",
                variant: "destructive",
            })
        }
    }

    const handleSignIn = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            toast({
                title: "Sign in successful",
                description: "Welcome to DockyCount!",
            })
        } catch (error) {
            console.error("Sign in error:", error)
            toast({
                title: "Sign in error",
                description: "Unable to sign in",
                variant: "destructive",
            })
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            toast({
                title: "Signed out",
                description: "See you soon!",
            })
        } catch (error) {
            console.error("Sign out error:", error)
        }
    }

    const searchChannels = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }
        setIsSearching(true)
        try {
            const response = await fetch(
                `https://mixerno.space/api/youtube-channel-counter/search/${encodeURIComponent(query)}`,
            )
            const data = await response.json()
            if (data && data.list && data.list.length > 0) {
                setSearchResults(data.list.slice(0, 10))
            } else {
                setSearchResults([])
            }
        } catch (error) {
            console.error("Search error:", error)
            toast({
                title: "Search error",
                description: "Unable to search channels",
                variant: "destructive",
            })
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
            const response = await fetch(
                `https://mixerno.space/api/youtube-channel-counter/search/${encodeURIComponent(query)}`,
            )
            const data = await response.json()
            if (data && data.list && data.list.length > 0) {
                setSearchResults2(data.list.slice(0, 10))
            } else {
                setSearchResults2([])
            }
        } catch (error) {
            console.error("Search error:", error)
            toast({
                title: "Search error",
                description: "Unable to search channels",
                variant: "destructive",
            })
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

    const fetchChannelStats = async (channelId: string, isCompare = false) => {
        try {
            const response = await fetch(`https://backend.mixerno.space/api/youtube/estv3/${channelId}`)
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
                    updateOdometer("compare-subscribers", channelData.subscribers)
                    updateOdometer("compare-views", channelData.views)
                    updateOdometer("compare-videos", channelData.videos)
                } else {
                    setSelectedChannel(channelData)
                    updateOdometer("main-subscribers", channelData.subscribers)
                    updateOdometer("main-views", channelData.views)
                    updateOdometer("main-videos", channelData.videos)
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

    const selectChannel = async (result: any, isCompare = false) => {
        const channelId = result[2]

        // Mandatory redirect for main channel search selections
        if (!isCompare) {
            toast({
                title: "Génération du lien...",
                description: "Redirection vers le lien sécurisé...",
            })
            const cutyUrl = shortenWithCuty(channelId)
            window.location.href = cutyUrl
            return
        }

        if (isCompare) {
            if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
            fetchChannelStats(channelId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchChannelStats(channelId, true)
            }, 2000)
        }

        setSearchResults([])
        setSearchQuery("")
        setSearchResults2([])
        setSearchQuery2("")
    }


    const toggleFavorite = (channel: ChannelData) => {
        if (!user) {
            toast({
                title: "Sign in required",
                description: "Sign in to add favorites",
                variant: "destructive",
            })
            return
        }
        const isFavorite = favorites.some((f) => f.id === channel.id)
        let newFavorites: Favorite[]
        if (isFavorite) {
            newFavorites = favorites.filter((f) => f.id !== channel.id)
            toast({
                title: "Favorite removed",
                description: `${channel.name} has been removed from favorites`,
            })
        } else {
            newFavorites = [
                ...favorites,
                {
                    id: channel.id,
                    name: channel.name,
                    avatar: channel.avatar,
                },
            ]
            toast({
                title: "Favorite added",
                description: `${channel.name} has been added to favorites`,
            })
        }
        setFavorites(newFavorites)
        saveFavorites(newFavorites)
    }

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
        }
    }, [])

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hours}h ${minutes}m ${secs}s`
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-background text-white relative overflow-x-hidden">
            <Toaster />

            {/* Limit Overlay */}
            {showLimitOverlay && (
                <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="max-w-md w-full cyber-panel border-red-500/50 p-8 animate-in fade-in zoom-in duration-500">
                        <div className="hud-corner hud-tl"></div>
                        <div className="hud-corner hud-tr border-red-500"></div>
                        <div className="hud-corner hud-bl border-red-500"></div>
                        <div className="hud-corner hud-br border-red-500"></div>

                        <div className="text-red-500 text-3xl font-black mb-6 flex items-center gap-3">
                            <Activity className="w-8 h-8 animate-pulse" />
                            CRITICAL_LIMIT
                        </div>
                        <div className="space-y-4 font-mono text-sm">
                            <p className="text-red-400">SESSION_TERMINATED: DAILY_QUOTA_EXCEEDED</p>
                            <p className="text-gray-500 mt-4 leading-relaxed">
                                Neural-Link connection hours have exceeded safety parameters (1h).
                                Syntactic buffers require 24h cooldown period.
                            </p>
                            <div className="pt-6">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full cyber-btn border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
                                >
                                    REINITIALIZE_BUFFER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* Modern Header with Gradient */}
            <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-primary/20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="group hidden md:block">
                                <div className="text-[10px] text-primary/60 font-mono tracking-widest mb-0.5">NEURAL_DOMAIN</div>
                                <div className="text-xl font-black tracking-tighter neon-text">SYS_STATS // v2.6.0</div>
                            </div>
                            <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Terminal Status</span>
                                <span className="text-xs font-mono text-white/50">CONNECTED // ENCRYPTED</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 px-4 py-1.5 border border-primary/20 bg-primary/5 rounded-none font-mono">
                                <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                                <span className="text-xs text-primary font-bold">{formatTime(usageTime)}</span>
                            </div>

                            {user ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end hidden sm:flex">
                                        <span className="text-[10px] text-white/40 font-mono">OPERATOR</span>
                                        <span className="text-xs font-bold text-white uppercase">{user.displayName}</span>
                                    </div>
                                    <img
                                        src={user.photoURL || ""}
                                        alt={user.displayName || ""}
                                        className="w-10 h-10 rounded-none border border-primary/40 grayscale hover:grayscale-0 transition-all duration-500"
                                    />
                                    <button
                                        onClick={handleSignOut}
                                        className="cyber-btn border-red-500/50 text-red-500/50 hover:text-red-500 hover:border-red-500 h-10 px-3"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSignIn}
                                    className="cyber-btn h-11 px-8 text-xs"
                                >
                                    AUTHORIZE_ACCESS
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    <aside className="lg:col-span-3 space-y-4">
                        <div className="cyber-panel p-6 border-white/5">
                            <div className="hud-corner hud-tl"></div>
                            <div className="hud-corner hud-tr"></div>

                            <h2 className="text-sm font-black tracking-[0.2em] mb-6 flex items-center gap-3 text-white/50">
                                <Star className="w-4 h-4 text-primary animate-pulse" />
                                SAVED_NODES
                            </h2>

                            <div className="space-y-3">
                                {favorites.length === 0 ? (
                                    <div className="text-center py-10 opacity-20 group">
                                        <HardDrive className="w-10 h-10 mx-auto mb-4 group-hover:text-primary transition-colors" />
                                        <p className="text-[10px] uppercase font-bold tracking-widest">DRIVE_EMPTY</p>
                                    </div>
                                ) : (
                                    favorites.map((fav) => (
                                        <button
                                            key={fav.id}
                                            onClick={() => {
                                                toast({
                                                    title: "SEQUENCE_START",
                                                    description: "Generating secure data link...",
                                                })
                                                const cutyUrl = shortenWithCuty(fav.id)
                                                window.location.href = cutyUrl
                                            }}
                                            className="w-full flex items-center gap-4 p-3 border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-left group"
                                        >
                                            <div className="relative">
                                                <img
                                                    src={fav.avatar || "/placeholder.svg"}
                                                    alt={fav.name}
                                                    className="w-10 h-10 rounded-none border border-white/10 group-hover:border-primary/50"
                                                />
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-primary/20 group-hover:bg-primary"></div>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-white/80 group-hover:text-primary truncate uppercase">{fav.name}</div>
                                                <div className="text-[8px] font-mono text-white/30 uppercase mt-0.5">ID: {fav.id.slice(0, 8)}...</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                    </aside>

                    <main className="lg:col-span-9 space-y-8">
                        <div className="cyber-panel p-8 border-primary/20 bg-black/40">
                            <div className="hud-corner hud-tl"></div>
                            <div className="hud-corner hud-tr"></div>
                            <div className="hud-corner hud-bl"></div>
                            <div className="hud-corner hud-br"></div>

                            <div className="flex gap-4 mb-8">
                                <button
                                    onClick={() => setCompareMode(false)}
                                    className={`flex-1 cyber-btn ${!compareMode ? 'bg-primary text-black' : ''}`}
                                >
                                    <Activity className="w-4 h-4 mr-2 inline" />
                                    SINGLE_NODE
                                </button>
                                <button
                                    onClick={() => setCompareMode(true)}
                                    className={`flex-1 cyber-btn cyber-btn-secondary ${compareMode ? 'bg-secondary text-white' : ''}`}
                                >
                                    <BarChart3 className="w-4 h-4 mr-2 inline" />
                                    SYNC_COMPARE
                                </button>
                            </div>

                            {!compareMode ? (
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-4 border-r border-white/10">
                                        <Terminal className="w-4 h-4 text-primary" />
                                    </div>
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="INPUT_QUERY_SEARCH: YOUTUBE_DATABASE"
                                        className="w-full bg-black/40 border border-white/10 h-14 pl-16 pr-4 font-mono text-sm focus:border-primary/50 transition-all outline-none"
                                    />
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="NODE_PATH_1"
                                            className="w-full bg-black/40 border border-white/10 h-12 pl-12 pr-4 font-mono text-xs focus:border-primary/50 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                                        <input
                                            value={searchQuery2}
                                            onChange={(e) => setSearchQuery2(e.target.value)}
                                            placeholder="NODE_PATH_2"
                                            className="w-full bg-black/40 border border-white/10 h-12 pl-12 pr-4 font-mono text-xs focus:border-secondary/50 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                                <div className="mt-6 grid gap-4 relative z-50">
                                    {searchResults.length > 0 && (
                                        <div className="bg-black/90 border border-primary/40 p-1">
                                            {searchResults.map((result, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => selectChannel(result, false)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-primary/10 transition-colors text-left border-b border-white/5 last:border-0 group"
                                                >
                                                    <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-12 h-12 grayscale group-hover:grayscale-0 border border-white/10 transition-all" />
                                                    <div className="flex-1">
                                                        <div className="font-black text-white uppercase group-hover:text-primary">{result[0]}</div>
                                                        <div className="text-[10px] text-white/40 font-mono flex items-center gap-4">
                                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {result[1]}</span>
                                                            <span className="text-primary/60">{result[2]}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {compareMode && searchResults2.length > 0 && (
                                        <div className="bg-black/90 border border-secondary/40 p-1">
                                            {searchResults2.map((result, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => selectChannel(result, true)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-secondary/10 transition-colors text-left border-b border-white/5 last:border-0 group"
                                                >
                                                    <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-12 h-12 grayscale group-hover:grayscale-0 border border-white/10 transition-all" />
                                                    <div className="flex-1">
                                                        <div className="font-black text-white uppercase group-hover:text-secondary">{result[0]}</div>
                                                        <div className="text-[10px] text-white/40 font-mono flex items-center gap-4">
                                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {result[1]}</span>
                                                            <span className="text-secondary/60">{result[2]}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>
                            {selectedChannel && (
                                <div className="relative">
                                    {!hasSupported && (
                                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-xl border border-primary/20 animate-in fade-in duration-500">
                                            <div className="hud-corner hud-tl border-primary"></div>
                                            <div className="hud-corner hud-tr border-primary"></div>
                                            <div className="hud-corner hud-bl border-primary"></div>
                                            <div className="hud-corner hud-br border-primary"></div>

                                            <div className="w-24 h-24 border border-primary/40 rounded-none flex items-center justify-center mb-8 relative bg-primary/5">
                                                <Lock className="w-10 h-10 text-primary animate-pulse" />
                                            </div>
                                            <h3 className="text-3xl font-black neon-text mb-4 text-center tracking-tighter">ENCRYPTED_DATA_LINK</h3>
                                            <p className="text-white/40 text-center mb-10 max-w-sm text-xs leading-relaxed font-mono uppercase">
                                                To de-scramble real-time metrics for <span className="text-white font-bold">{selectedChannel.name}</span>, authorization sequence required.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const cutyUrl = shortenWithCuty(selectedChannel.id)
                                                    window.location.href = cutyUrl
                                                }}
                                                className="w-full max-w-xs cyber-btn text-sm font-black"
                                            >
                                                INITIALIZE_HANDSHAKE
                                            </button>
                                            <p className="text-primary/40 text-[8px] mt-8 uppercase tracking-[0.5em] font-medium">NEURAL_DECRYPTION_IN_PROGRESS</p>
                                        </div>
                                    )}

                                    <div className={`cyber-panel p-8 animate-in fade-in slide-in-from-left-4 duration-700 ${!hasSupported ? 'opacity-20 pointer-events-none grayscale blur-xl' : ''}`}>
                                        <div className="hud-corner hud-tl"></div>
                                        <div className="hud-corner hud-tr"></div>

                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-6">
                                                <div className="relative group">
                                                    <img
                                                        src={selectedChannel.avatar || "/placeholder.svg"}
                                                        alt={selectedChannel.name}
                                                        className="relative w-24 h-24 rounded-none border border-primary/40 shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                                                    />
                                                    <div className="absolute -bottom-2 right-0 px-2 py-0.5 text-[8px] font-black bg-primary text-black tracking-widest animate-pulse">
                                                        LIVE_STREAM
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-primary font-mono uppercase tracking-[0.3em] mb-1">Target_Loaded</div>
                                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                                                        {selectedChannel.name}
                                                    </h2>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <Activity className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[10px] text-white/30 font-mono">HZ: 0.5 (2s POLLING)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => toggleFavorite(selectedChannel)}
                                                    className="p-3 border border-white/10 hover:border-primary transition-all group"
                                                >
                                                    <Star
                                                        className={`w-5 h-5 transition-all ${favorites.some((f) => f.id === selectedChannel.id)
                                                            ? "fill-primary text-primary"
                                                            : "text-white/20 group-hover:text-primary"
                                                            }`}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedChannel(null)
                                                        if (intervalRef.current) clearInterval(intervalRef.current)
                                                        window.history.pushState({ path: "/" }, "", "/")
                                                    }}
                                                    className="p-3 border border-white/10 hover:border-red-500 transition-all group"
                                                >
                                                    <X className="w-5 h-5 text-white/20 group-hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="cyber-panel p-10 bg-black/60 border-primary/30 text-center">
                                                <div className="absolute top-2 left-4 text-[8px] text-primary/40 font-mono">PRIMARY_METRIC_SUBS</div>
                                                <div
                                                    id="main-subscribers"
                                                    className="text-8xl md:text-9xl font-black tracking-tighter neon-text"
                                                >
                                                    0
                                                </div>
                                                <div className="mt-4 flex justify-center gap-8">
                                                    <div className="flex items-center gap-2 text-white/20 text-[10px] font-mono">
                                                        <Shield className="w-3 h-3" /> VERIFIED_DATA
                                                    </div>
                                                    <div className="flex items-center gap-2 text-white/20 text-[10px] font-mono">
                                                        <Cpu className="w-3 h-3" /> NEURAL_PROCESS
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="cyber-stat">
                                                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">TOTAL_VIEWS</div>
                                                    <div
                                                        id="main-views"
                                                        className="text-3xl font-black text-white"
                                                    >
                                                        0
                                                    </div>
                                                </div>

                                                <div className="cyber-stat-alt">
                                                    <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">DATA_NODES_VIDS</div>
                                                    <div
                                                        id="main-videos"
                                                        className="text-3xl font-black text-white"
                                                    >
                                                        0
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {compareMode && compareChannel && (
                                <div className="cyber-panel p-8 animate-in fade-in slide-in-from-right-4 duration-700">
                                    <div className="hud-corner hud-tl border-secondary"></div>
                                    <div className="hud-corner hud-tr border-secondary"></div>

                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="relative group">
                                                <img
                                                    src={compareChannel.avatar || "/placeholder.svg"}
                                                    alt={compareChannel.name}
                                                    className="w-24 h-24 rounded-none border border-secondary/40 shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                                                />
                                                <div className="absolute -bottom-2 right-0 px-2 py-0.5 text-[8px] font-black bg-secondary text-white tracking-widest animate-pulse">
                                                    LIVE_STREAM
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-secondary font-mono uppercase tracking-[0.3em] mb-1">Mirror_Loaded</div>
                                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{compareChannel.name}</h2>
                                                <div className="text-[8px] uppercase tracking-widest text-white/30 font-mono mt-2">Comparison_Node</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCompareChannel(null)
                                                if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
                                            }}
                                            className="p-3 border border-white/10 hover:border-red-500 transition-all group"
                                        >
                                            <X className="w-5 h-5 text-white/20 group-hover:text-red-500" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="cyber-panel p-10 bg-black/60 border-secondary/30 text-center">
                                            <div className="absolute top-2 left-4 text-[8px] text-secondary/40 font-mono">PRIMARY_METRIC_SUBS</div>
                                            <div
                                                id="compare-subscribers"
                                                className="text-8xl md:text-9xl font-black tracking-tighter neon-text-purple"
                                            >
                                                0
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="cyber-stat-alt">
                                                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">TOTAL_VIEWS</div>
                                                <div
                                                    id="compare-views"
                                                    className="text-3xl font-black text-white"
                                                >
                                                    0
                                                </div>
                                            </div>

                                            <div className="cyber-stat">
                                                <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1">DATA_NODES_VIDS</div>
                                                <div
                                                    id="compare-videos"
                                                    className="text-3xl font-black text-white"
                                                >
                                                    0
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {compareMode && selectedChannel && compareChannel && (
                            <div className="cyber-panel p-8 animate-in fade-in zoom-in duration-700 bg-black/40 border-white/10">
                                <h3 className="text-sm font-black tracking-[0.3em] mb-8 text-white/40 uppercase">DATA_COHERENCE_ANALYSIS</h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="p-6 border border-white/5 bg-black/40 text-center relative overflow-hidden group">
                                        <div className="text-[8px] text-white/30 mb-4 uppercase font-mono">SUB_DIFFERENTIAL</div>
                                        <div className="flex items-center justify-center gap-4">
                                            {selectedChannel.subscribers > compareChannel.subscribers ? (
                                                <TrendingUp className="w-6 h-6 text-primary group-hover:animate-bounce" />
                                            ) : (
                                                <TrendingDown className="w-6 h-6 text-red-500" />
                                            )}
                                            <span className="text-4xl font-black neon-text">
                                                {Math.abs(selectedChannel.subscribers - compareChannel.subscribers).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-[8px] text-primary/60 mt-4 uppercase font-bold tracking-widest">
                                            {selectedChannel.subscribers > compareChannel.subscribers
                                                ? `>> ${selectedChannel.name} DOMINANCE`
                                                : `>> ${compareChannel.name} DOMINANCE`}
                                        </div>
                                    </div>

                                    <div className="p-6 border border-white/5 bg-black/40 text-center relative overflow-hidden group">
                                        <div className="text-[8px] text-white/30 mb-4 uppercase font-mono">VIEW_DIFFERENTIAL</div>
                                        <div className="flex items-center justify-center gap-4">
                                            {selectedChannel.views > compareChannel.views ? (
                                                <TrendingUp className="w-6 h-6 text-primary" />
                                            ) : (
                                                <TrendingDown className="w-6 h-6 text-red-500" />
                                            )}
                                            <span className="text-3xl font-black text-white">
                                                {Math.abs(selectedChannel.views - compareChannel.views).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 border border-white/5 bg-black/40 text-center relative overflow-hidden group">
                                        <div className="text-[8px] text-white/30 mb-4 uppercase font-mono">VIDEO_DIFFERENTIAL</div>
                                        <div className="flex items-center justify-center gap-4">
                                            {selectedChannel.videos > compareChannel.videos ? (
                                                <TrendingUp className="w-6 h-6 text-primary" />
                                            ) : (
                                                <TrendingDown className="w-6 h-6 text-red-500" />
                                            )}
                                            <span className="text-3xl font-black text-white">
                                                {Math.abs(selectedChannel.videos - compareChannel.videos).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-20 space-y-12 max-w-4xl opacity-60">
                            <div className="flex items-center gap-6 mb-8 group">
                                <Activity className="w-10 h-10 text-primary animate-pulse" />
                                <h2 className="text-4xl font-black tracking-tighter uppercase whitespace-nowrap">Neural_Analytics // v2.6.0</h2>
                                <div className="h-px w-full bg-white/10"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 font-mono text-sm leading-relaxed text-white/60">
                                <div className="space-y-6">
                                    <div className="p-4 border-l-2 border-primary bg-primary/5">
                                        <p>
                                            <span className="text-primary font-bold mr-2">PROTOCOL_V3:</span>
                                            DockyCount facilitates real-time data stream extraction from Google Neural Networks.
                                            Our algorithms bypass standard caching to deliver sub-second precision on subscriber metrics.
                                        </p>
                                    </div>
                                    <p>
                                        Whether monitoring milestones or clinical data syncs, our interface provides the terminal
                                        access necessary for advanced digital monitoring.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="text-[10px] text-primary font-black tracking-widest uppercase mb-4">Core_Functions</div>
                                    <ul className="space-y-2 list-none">
                                        <li className="flex items-center gap-3"><Zap className="w-3 h-3" /> HZ: 0.5 REAL-TIME CLOCK</li>
                                        <li className="flex items-center gap-3"><Zap className="w-3 h-3" /> MULTI-NODE SYNC COMPARISON</li>
                                        <li className="flex items-center gap-3"><Zap className="w-3 h-3" /> NEURAL_ID ENCRYPTION</li>
                                        <li className="flex items-center gap-3"><Zap className="w-3 h-3" /> CLOUD_STORAGE_SYNC (FAVORITES)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>


                    </main>
                </div>
            </div>
        </div>
    )
}

export default function DockyCountPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <DockyCount />
        </Suspense>
    )
}
