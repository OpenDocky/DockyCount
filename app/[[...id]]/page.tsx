"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Search, Star, LogOut, TrendingUp, TrendingDown, Users, Eye, Video, X, Layout, Activity, BarChart3, Globe, Shield, ChevronRight, Share2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import Link from "next/link"

// Firebase types (actual modules loaded dynamically)
type User = any
type Auth = any
type Firestore = any

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

    // Firebase refs (loaded dynamically)
    const authRef = useRef<Auth | null>(null)
    const dbRef = useRef<Firestore | null>(null)
    const firebaseModulesRef = useRef<{
        signInWithPopup: any,
        signOut: any,
        GoogleAuthProvider: any,
        doc: any,
        getDoc: any,
        setDoc: any
    } | null>(null)
    const firebaseLoadedRef = useRef(false)

    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()

    // Load Firebase dynamically on mount
    useEffect(() => {
        setMounted(true)

        if (firebaseLoadedRef.current) return
        firebaseLoadedRef.current = true

        // Dynamic import of Firebase modules
        Promise.all([
            import("firebase/app"),
            import("firebase/auth"),
            import("firebase/firestore")
        ]).then(([appModule, authModule, firestoreModule]) => {
            const firebaseConfig = {
                apiKey: "AIzaSyAjmXMMafuPYkYi1GzrnucNJSjxypN2gYQ",
                authDomain: "docky-dev-fr.firebaseapp.com",
                projectId: "docky-dev-fr",
                storageBucket: "docky-dev-fr.firebasestorage.app",
                messagingSenderId: "548202839817",
                appId: "1:548202839817:web:832f713ae5135e41809dd8",
                measurementId: "G-KLXHVFYQYY",
            }

            const app = appModule.getApps().length > 0
                ? appModule.getApp()
                : appModule.initializeApp(firebaseConfig)

            authRef.current = authModule.getAuth(app)
            dbRef.current = firestoreModule.getFirestore(app)

            // Store module functions for later use
            firebaseModulesRef.current = {
                signInWithPopup: authModule.signInWithPopup,
                signOut: authModule.signOut,
                GoogleAuthProvider: authModule.GoogleAuthProvider,
                doc: firestoreModule.doc,
                getDoc: firestoreModule.getDoc,
                setDoc: firestoreModule.setDoc
            }

            // Setup auth listener
            authModule.onAuthStateChanged(authRef.current, async (currentUser: User) => {
                setUser(currentUser)
                if (currentUser && dbRef.current) {
                    try {
                        const userDoc = await firestoreModule.getDoc(firestoreModule.doc(dbRef.current, "users", currentUser.uid))
                        if (userDoc.exists()) {
                            const data = userDoc.data()
                            setFavorites(data.favorites || [])
                        }
                    } catch (error) {
                        console.error("Error loading favorites:", error)
                    }
                } else {
                    setFavorites([])
                }
            })
        }).catch(err => {
            console.error("Failed to load Firebase:", err)
        })
    }, [])

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const compareIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const usageIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const odometerLoadedRef = useRef(false)

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

    // Auto-update Odometer when channel data changes (safer approach)
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

    const searchChannels = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }
        setIsSearching(true)
        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,
            )
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
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,
            )
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

    // Internal function called from useEffect with direct module access
    const loadUserFavoritesInternal = async (uid: string, getDocFn: any, docFn: any, database: any) => {
        try {
            const userDoc = await getDocFn(docFn(database, "users", uid))
            if (userDoc.exists()) {
                const data = userDoc.data()
                setFavorites(data.favorites || [])
            }
        } catch (error) {
            console.error("Error loading favorites:", error)
        }
    }

    const loadUserFavorites = async (uid: string) => {
        if (!firebaseModulesRef.current || !dbRef.current) return
        const { getDoc, doc } = firebaseModulesRef.current
        try {
            const userDoc = await getDoc(doc(dbRef.current, "users", uid))
            if (userDoc.exists()) {
                const data = userDoc.data()
                setFavorites(data.favorites || [])
            }
        } catch (error) {
            console.error("Error loading favorites:", error)
        }
    }

    const saveFavorites = async (newFavorites: Favorite[]) => {
        if (!user || !firebaseModulesRef.current || !dbRef.current) return
        const { setDoc, doc } = firebaseModulesRef.current
        try {
            await setDoc(doc(dbRef.current, "users", user.uid), {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                favorites: newFavorites,
            })
        } catch (error) {
            console.error("Error saving favorites:", error)
        }
    }

    const handleSignIn = async () => {
        if (!firebaseModulesRef.current || !authRef.current) return
        const { signInWithPopup, GoogleAuthProvider } = firebaseModulesRef.current
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(authRef.current, provider)
        } catch (error) {
            console.error("Sign in error:", error)
        }
    }

    const handleSignOut = async () => {
        if (!firebaseModulesRef.current || !authRef.current) return
        const { signOut } = firebaseModulesRef.current
        try {
            await signOut(authRef.current)
        } catch (error) {
            console.error("Sign out error:", error)
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
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please sign in to save favorites.",
                variant: "destructive",
            })
            return
        }
        const isFavorite = favorites.some((f) => f.id === channel.id)
        let newFavorites: Favorite[]
        if (isFavorite) {
            newFavorites = favorites.filter((f) => f.id !== channel.id)
        } else {
            newFavorites = [...favorites, { id: channel.id, name: channel.name, avatar: channel.avatar }]
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
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter gradient-text">DockyCount v19</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Live Network
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">

                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary rounded-2xl text-xs font-bold text-muted-foreground">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            {formatTime(usageTime)} active
                        </div>

                        {user ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={user.photoURL || ""}
                                    alt={user.displayName || ""}
                                    className="w-10 h-10 rounded-2xl border border-border soft-shadow transition-transform hover:scale-105"
                                />
                                <button
                                    onClick={handleSignOut}
                                    className="aura-btn-secondary p-2.5 rounded-2xl"
                                >
                                    <LogOut className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleSignIn} className="aura-btn">
                                Sign In
                            </button>
                        )}
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

                        <div className="aura-card p-6 bg-primary/5 border-primary/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <Info className="w-4 h-4 text-primary" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary">v19 Features</h4>
                            </div>
                            <ul className="space-y-3 text-[11px] font-medium text-muted-foreground/80">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /> Milestone Tracking</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /> Sub-second Accuracy</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full" /> Cloud Sync Protection</li>
                            </ul>
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
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground pointer-events-none z-20" />
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
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-20" />
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Channel 1..."
                                                className="aura-input !pl-14 py-3 h-14 text-sm"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-20" />
                                            <input
                                                value={searchQuery2}
                                                onChange={(e) => setSearchQuery2(e.target.value)}
                                                placeholder="Channel 2..."
                                                className="aura-input !pl-14 py-3 h-14 text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                                    <div className="absolute top-[calc(100%+0.75rem)] left-0 right-0 z-[999] rounded-3xl shadow-2xl p-2 overflow-hidden bg-white dark:bg-slate-950 border border-border animate-in fade-in slide-in-from-top-3 ring-1 ring-black/5">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={`s1-${index}`}
                                                onClick={() => selectChannel(result, false)}
                                                className="w-full flex items-center gap-4 p-4 hover:bg-secondary rounded-2xl transition-colors text-left"
                                            >
                                                <img src={result[3]} alt={result[0]} className="w-12 h-12 rounded-xl flex-shrink-0 object-cover border border-border" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold text-base truncate">{result[0]}</div>
                                                    <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest truncate">
                                                        {result[1]?.toString().startsWith('http') ? 'Channel' : result[1]}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {compareMode && searchResults2.length > 0 && (
                                            <div className="border-t border-border mt-2 pt-2">
                                                {searchResults2.map((result, index) => (
                                                    <button
                                                        key={`s2-${index}`}
                                                        onClick={() => selectChannel(result, true)}
                                                        className="w-full flex items-center gap-4 p-4 hover:bg-secondary rounded-2xl transition-colors text-left"
                                                    >
                                                        <img src={result[3]} alt={result[0]} className="w-12 h-12 rounded-xl border border-primary/20 flex-shrink-0 object-cover" />
                                                        <div className="flex-1 overflow-hidden">
                                                            <div className="font-bold text-base text-primary truncate">{result[0]}</div>
                                                            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest truncate">
                                                                {result[1]?.toString().startsWith('http') ? 'Channel' : result[1]}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-8 relative z-0`}>
                            {selectedChannel && (
                                <div className="space-y-6">
                                    <div className={`aura-card ${compareMode ? 'p-6' : 'p-10'} flex flex-col items-center text-center relative overflow-hidden`}>
                                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />

                                        <div className="flex flex-col items-center gap-6 mb-12">
                                            <div className="relative group">
                                                <img
                                                    src={selectedChannel.avatar}
                                                    alt={selectedChannel.name}
                                                    className="w-28 h-28 rounded-3xl border-4 border-background soft-shadow transition-transform group-hover:scale-105 duration-500"
                                                />
                                                <div className="absolute -bottom-2 -right-2 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                                                    Live
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-black tracking-tight mb-2 leading-tight">{selectedChannel.name}</h2>
                                                <div className="flex items-center justify-center gap-4">
                                                    <button onClick={() => toggleFavorite(selectedChannel)} className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-secondary">
                                                        <Star className={`w-5 h-5 ${favorites.some(f => f.id === selectedChannel.id) ? 'fill-primary text-primary' : ''}`} />
                                                    </button>
                                                    <button className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-secondary">
                                                        <Share2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full space-y-2 flex flex-col items-center">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subscriber Count</div>
                                            <div id="main-subscribers" className={`${compareMode ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-7xl md:text-8xl'} font-black tracking-tighter tabular-nums whitespace-nowrap flex justify-center transition-all duration-300`}>0</div>
                                        </div>

                                        <MilestoneTracker
                                            current={selectedChannel.subscribers}
                                            goal={getNextMilestone(selectedChannel.subscribers)}
                                        />

                                        <div className="grid grid-cols-2 w-full gap-4 mt-12 pt-8 border-t border-border">
                                            <div className="text-center">
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Views</div>
                                                <div id="main-views" className={`${compareMode ? 'text-lg md:text-xl' : 'text-2xl'} font-black`}>0</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Videos</div>
                                                <div id="main-videos" className={`${compareMode ? 'text-lg md:text-xl' : 'text-2xl'} font-black`}>0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {compareMode && compareChannel && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                    <div className="aura-card p-6 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-secondary-foreground/10" />

                                        <div className="flex flex-col items-center gap-6 mb-12">
                                            <img
                                                src={compareChannel.avatar}
                                                alt={compareChannel.name}
                                                className="w-28 h-28 rounded-3xl border-4 border-background soft-shadow hover:scale-105 duration-500 transition-transform"
                                            />
                                            <h2 className="text-3xl font-black tracking-tight mb-2 leading-tight">{compareChannel.name}</h2>
                                        </div>

                                        <div className="w-full space-y-2 flex flex-col items-center">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subscriber Count</div>
                                            <div id="compare-subscribers" className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter tabular-nums text-primary whitespace-nowrap flex justify-center transition-all duration-300">0</div>
                                        </div>

                                        <MilestoneTracker
                                            current={compareChannel.subscribers}
                                            goal={getNextMilestone(compareChannel.subscribers)}
                                        />

                                        <div className="grid grid-cols-2 w-full gap-4 mt-12 pt-8 border-t border-border">
                                            <div className="text-center">
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Views</div>
                                                <div id="compare-views" className="text-lg md:text-xl font-black">0</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Videos</div>
                                                <div id="compare-videos" className="text-lg md:text-xl font-black">0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {compareMode && selectedChannel && compareChannel && (
                            <div className="aura-card p-10 animate-in fade-in zoom-in">
                                <h3 className="text-center text-sm font-black uppercase tracking-[0.3em] mb-12 text-muted-foreground">Comparison Analysis</h3>
                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="text-center space-y-4">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sub Gap</div>
                                        <div className="flex items-center justify-center gap-3">
                                            {selectedChannel.subscribers > compareChannel.subscribers ? <TrendingUp className="text-green-500 w-6 h-6" /> : <TrendingDown className="text-rose-500 w-6 h-6" />}
                                            <div className="text-4xl font-black tabular-nums">{Math.abs(selectedChannel.subscribers - compareChannel.subscribers).toLocaleString()}</div>
                                        </div>
                                        <div className="text-[9px] font-bold text-primary uppercase">
                                            {selectedChannel.subscribers > compareChannel.subscribers ? `${selectedChannel.name} lead` : `${compareChannel.name} lead`}
                                        </div>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Views Gap</div>
                                        <div className="text-3xl font-black tabular-nums">{Math.abs(selectedChannel.views - compareChannel.views).toLocaleString()}</div>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Video Gap</div>
                                        <div className="text-3xl font-black tabular-nums">{Math.abs(selectedChannel.videos - compareChannel.videos).toLocaleString()}</div>
                                    </div>
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
            <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <DockyCount />
        </Suspense>
    )
}
