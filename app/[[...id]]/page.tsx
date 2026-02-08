"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, TrendingDown, Layout, Activity, BarChart3, Globe, ChevronRight, Share2, Info, Check, Maximize2, Minimize2, Play } from "lucide-react"
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

interface VideoData {
    id: string
    title: string
    thumbnail: string
    views: number
    likes: number
    comments: number
    goal: number | null
    apiViews: number | null
    uploadedBy?: string
}

interface TikTokData {
    id: string
    name: string
    avatar: string
    followers: number
    likes: number
    following: number
    videos: number
}

interface TwitterData {
    id: string
    name: string
    avatar: string
    followers: number
    likes: number
    tweets: number
}

interface InstagramData {
    id: string
    name: string
    avatar: string
    followers: number
    likes: number
    posts: number
}

interface Favorite {
    id: string
    name: string
    avatar: string
    type?: "channel" | "video"
    platform?: string
}

type ContentMode = "channel" | "video"

// export const dynamic = "force-dynamic"
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
    const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
    const [compareVideo, setCompareVideo] = useState<VideoData | null>(null)
    const [selectedTikTok, setSelectedTikTok] = useState<TikTokData | null>(null)
    const [compareTikTok, setCompareTikTok] = useState<TikTokData | null>(null)
    const [selectedTwitter, setSelectedTwitter] = useState<TwitterData | null>(null)
    const [compareTwitter, setCompareTwitter] = useState<TwitterData | null>(null)
    const [selectedInstagram, setSelectedInstagram] = useState<InstagramData | null>(null)
    const [compareInstagram, setCompareInstagram] = useState<InstagramData | null>(null)
    const [favorites, setFavorites] = useState<Favorite[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [compareMode, setCompareMode] = useState(false)
    const [usageTime, setUsageTime] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [primaryGap, setPrimaryGap] = useState<number | null>(null)

    const searchParams = useSearchParams()
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()

    const idParam = params?.id
    const rawSegments = idParam ? (Array.isArray(idParam) ? idParam : [idParam]) : []
    const pathSegments = rawSegments.filter(Boolean)

    let pathPlatform: string | null = null
    let pathMode: ContentMode | null = null
    let pathId: string | null = null

    if (pathSegments.length > 0) {
        const first = pathSegments[0].toLowerCase()
        if (first === "youtube") {
            pathPlatform = "youtube"
            if (pathSegments[1] === "channel" || pathSegments[1] === "video") {
                pathMode = pathSegments[1] === "video" ? "video" : "channel"
                pathId = pathSegments[2] ?? null
            } else {
                pathMode = "channel"
                pathId = pathSegments[1] ?? null
            }
        } else if (["tiktok", "twitter", "instagram"].includes(first)) {
            pathPlatform = first
            pathMode = "channel"
            pathId = pathSegments[1] ?? null
        } else {
            // If the first segment isn't a platform, it's likely a legacy YouTube ID
            pathId = pathSegments[0]
            pathPlatform = "youtube"
            pathMode = "channel"
        }
    }

    const platform = pathPlatform || searchParams.get("platform") || "youtube"
    const rawModeFromQuery: ContentMode = searchParams.get("mode") === "video" ? "video" : "channel"
    const rawMode: ContentMode = pathMode ?? rawModeFromQuery
    const contentMode: ContentMode = platform === "youtube" ? rawMode : "channel"
    const isVideoMode = contentMode === "video"
    const isTikTok = platform === "tiktok"
    const isTwitter = platform === "twitter"
    const isInstagram = platform === "instagram"
    const currentItemId = pathId || searchParams.get("id")

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

    const parseCount = (value: unknown) => {
        if (value === null || value === undefined) return null
        if (typeof value === "number") return Number.isFinite(value) ? value : null
        if (typeof value === "string") {
            const normalized = value.replace(/,/g, "")
            const parsed = Number.parseInt(normalized, 10)
            return Number.isFinite(parsed) ? parsed : null
        }
        return null
    }

    const getVideoCount = (counts: any[], key: string) => {
        if (!counts || !Array.isArray(counts)) return null
        const entry = counts.find((item) => item?.value === key)
        return parseCount(entry?.count)
    }

    const getVideoUserValue = (user: any[], key: string) => {
        if (!user || !Array.isArray(user)) return null
        const entry = user.find((item) => item?.value === key)
        return typeof entry?.count === "string" ? entry.count : null
    }

    const fetchVideoStats = async (videoId: string, isCompare = false) => {
        try {
            const response = await fetch(`/api/video-stats/${videoId}`)
            const data = await response.json()
            if (data) {
                const title = getVideoUserValue(data.user, "name") || "Unknown video"
                const thumbnail = getVideoUserValue(data.user, "pfp") || getVideoUserValue(data.user, "banner") || ""
                const videoData: VideoData = {
                    id: videoId,
                    title,
                    thumbnail,
                    views: getVideoCount(data.counts, "views") ?? 0,
                    likes: getVideoCount(data.counts, "likes") ?? 0,
                    comments: getVideoCount(data.counts, "comments") ?? 0,
                    goal: getVideoCount(data.counts, "goal"),
                    apiViews: getVideoCount(data.counts, "apiviews"),
                    uploadedBy: typeof data.uploadedBY === "string" ? data.uploadedBY : undefined,
                }
                if (isCompare) {
                    setCompareVideo(videoData)
                } else {
                    setSelectedVideo(videoData)
                }
            }
        } catch (error) {
            console.error("Error fetching video stats:", error)
        }
    }

    const fetchTikTokStats = async (username: string, isCompare = false) => {
        try {
            const response = await fetch(`/api/tiktok-stats/${username}`)
            const data = await response.json()
            if (data) {
                const name = getVideoUserValue(data.user, "name") || username
                const avatar = getVideoUserValue(data.user, "pfp") || getVideoUserValue(data.user, "banner") || ""
                const tiktokData: TikTokData = {
                    id: username,
                    name,
                    avatar,
                    followers: getVideoCount(data.counts, "followers") ?? 0,
                    likes: getVideoCount(data.counts, "likes") ?? 0,
                    following: getVideoCount(data.counts, "following") ?? 0,
                    videos: getVideoCount(data.counts, "videos") ?? 0,
                }
                if (isCompare) {
                    setCompareTikTok(tiktokData)
                } else {
                    setSelectedTikTok(tiktokData)
                }
            }
        } catch (error) {
            console.error("Error fetching TikTok stats:", error)
        }
    }

    const fetchTwitterStats = async (username: string, isCompare = false) => {
        try {
            const response = await fetch(`/api/twitter-stats/${username}`)
            const data = await response.json()
            if (data) {
                const name = getVideoUserValue(data.user, "name") || username
                const avatar = getVideoUserValue(data.user, "pfp") || getVideoUserValue(data.user, "banner") || ""
                const twitterData: TwitterData = {
                    id: username,
                    name,
                    avatar,
                    followers: getVideoCount(data.counts, "followers") ?? 0,
                    likes: getVideoCount(data.counts, "likes") ?? 0,
                    tweets: getVideoCount(data.counts, "tweets") ?? 0,
                }
                if (isCompare) {
                    setCompareTwitter(twitterData)
                } else {
                    setSelectedTwitter(twitterData)
                }
            }
        } catch (error) {
            console.error("Error fetching Twitter stats:", error)
        }
    }

    const fetchInstagramStats = async (username: string, isCompare = false) => {
        try {
            const response = await fetch(`/api/instagram-stats/${username}`)
            const data = await response.json()
            if (data) {
                const name = getVideoUserValue(data.user, "name") || username
                const avatar = getVideoUserValue(data.user, "pfp") || getVideoUserValue(data.user, "banner") || ""
                const instagramData: InstagramData = {
                    id: username,
                    name,
                    avatar,
                    followers: getVideoCount(data.counts, "followers") ?? 0,
                    likes: getVideoCount(data.counts, "likes") ?? 0,
                    posts: getVideoCount(data.counts, "posts") ?? 0,
                }
                if (isCompare) {
                    setCompareInstagram(instagramData)
                } else {
                    setSelectedInstagram(instagramData)
                }
            }
        } catch (error) {
            console.error("Error fetching Instagram stats:", error)
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
            const endpoint = isTikTok ? "/api/tiktok-search" :
                isTwitter ? "/api/twitter-search" :
                    isInstagram ? "/api/instagram-search" :
                        (isVideoMode ? "/api/video-search" : "/api/search")
            const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`)
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
            const endpoint = isTikTok ? "/api/tiktok-search" :
                isTwitter ? "/api/twitter-search" :
                    isInstagram ? "/api/instagram-search" :
                        (isVideoMode ? "/api/video-search" : "/api/search")
            const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`)
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
        const itemId = getResultId(result)
        if (!itemId) return
        if (!isCompare) {
            router.push(buildItemUrl(itemId, contentMode))
            setSearchResults([])
            setSearchQuery("")
            return
        }
        if (isCompare) {
            if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
            if (isTikTok) {
                fetchTikTokStats(itemId, true)
                compareIntervalRef.current = setInterval(() => {
                    fetchTikTokStats(itemId, true)
                }, 2000)
            } else if (isTwitter) {
                fetchTwitterStats(itemId, true)
                compareIntervalRef.current = setInterval(() => {
                    fetchTwitterStats(itemId, true)
                }, 2000)
            } else if (isInstagram) {
                fetchInstagramStats(itemId, true)
                compareIntervalRef.current = setInterval(() => {
                    fetchInstagramStats(itemId, true)
                }, 2000)
            } else if (isVideoMode) {
                fetchVideoStats(itemId, true)
                compareIntervalRef.current = setInterval(() => {
                    fetchVideoStats(itemId, true)
                }, 2000)
            } else {
                fetchChannelStats(itemId, true)
                compareIntervalRef.current = setInterval(() => {
                    fetchChannelStats(itemId, true)
                }, 2000)
            }
        }
        setSearchResults2([])
        setSearchQuery2("")
    }

    const toggleFavorite = (item: { id: string, name: string, avatar: string }) => {
        const itemType: ContentMode = contentMode
        const isFavorite = favorites.some((f) => f.id === item.id && (f.type ?? "channel") === itemType && (f.platform ?? "youtube") === platform)
        let newFavorites: Favorite[]
        if (isFavorite) {
            newFavorites = favorites.filter((f) => !(f.id === item.id && (f.type ?? "channel") === itemType && (f.platform ?? "youtube") === platform))
        } else {
            newFavorites = [...favorites, { id: item.id, name: item.name, avatar: item.avatar, type: itemType, platform }]
        }
        setFavorites(newFavorites)
        localStorage.setItem("dockycount_favorites", JSON.stringify(newFavorites))
        toast({
            title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
            description: isFavorite ? `${item.name} removed` : `${item.name} saved`,
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

    const buildItemUrl = (id: string, mode: ContentMode, overridePlatform?: string) => {
        const resolvedPlatform = overridePlatform ?? platform
        if (resolvedPlatform === "youtube") {
            return mode === "video" ? `/youtube/video/${id}` : `/youtube/channel/${id}`
        }
        return `/${resolvedPlatform}/${id}`
    }

    const buildBasePath = (targetPlatform: string, targetMode: ContentMode) => {
        if (targetPlatform === "youtube") {
            return targetMode === "video" ? "/youtube/video" : "/youtube/channel"
        }
        return `/${targetPlatform}`
    }

    const updateContentMode = (mode: ContentMode) => {
        if (platform !== "youtube" && mode === "video") return
        const nextMode = platform === "youtube" ? mode : "channel"
        const basePath = buildBasePath(platform, nextMode)
        let nextId: string | null = currentItemId
        if (nextMode === "video" && nextId?.startsWith("UC")) {
            nextId = null
        }
        if (nextMode === "channel" && nextId && !nextId.startsWith("UC")) {
            nextId = null
        }
        const nextPath = nextId ? `${basePath}/${nextId}` : basePath
        router.replace(nextPath)
    }

    const updatePlatform = (value: string) => {
        const nextPlatform = value || "youtube"
        // Force channel mode for non-YouTube platforms
        const nextMode = nextPlatform === "youtube" ? contentMode : "channel"
        const basePath = buildBasePath(nextPlatform, nextMode)

        let nextId: string | null = currentItemId
        // Clear YouTube-specific IDs when moving to other platforms
        if (nextPlatform !== "youtube" && nextId?.startsWith("UC")) {
            nextId = null
        }
        // Clear non-YouTube IDs when moving to YouTube channel mode
        if (nextPlatform === "youtube" && nextMode === "channel" && nextId && !nextId.startsWith("UC")) {
            nextId = null
        }

        const nextPath = nextId ? `${basePath}/${nextId}` : basePath
        router.push(nextPath)
    }

    const getResultId = (result: any) => result?.[2] ?? ""
    const getResultTitle = (result: any) => result?.[0] ?? ""
    const getResultSubtitle = (result: any) => {
        if (isVideoMode) return result?.[2] ? `ID: ${result[2]}` : "Video"
        if (isTikTok) return result?.[2] ? `@${result[2]}` : "TikTok"
        if (isTwitter) return result?.[2] ? `@${result[2]}` : "Twitter"
        if (isInstagram) return result?.[2] ? `@${result[2]}` : "Instagram"
        return result?.[1] ?? ""
    }
    const getResultImage = (result: any) => {
        if (isVideoMode) return result?.[1] ?? ""
        if (isTikTok || isTwitter || isInstagram) return result?.[1] ?? ""
        return result?.[3] ?? ""
    }
    const isFavoriteItem = (id: string) =>
        favorites.some((fav) => fav.id === id && (fav.type ?? "channel") === contentMode && (fav.platform ?? "youtube") === platform)

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
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
        }
    }, [])

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
        setSelectedChannel(null)
        setCompareChannel(null)
        setSelectedVideo(null)
        setCompareVideo(null)
        setSelectedTikTok(null)
        setCompareTikTok(null)
        setSelectedTwitter(null)
        setCompareTwitter(null)
        setSelectedInstagram(null)
        setCompareInstagram(null)
        setPrimaryGap(null)
        setSearchResults([])
        setSearchResults2([])
        setSearchQuery("")
        setSearchQuery2("")
    }, [contentMode, platform])

    // Intentionally no URL normalization here; path-based routing controls mode/platform.

    useEffect(() => {
        const idFromPath = pathId
        const idFromSearch = searchParams.get("id")
        const itemId = idFromPath || idFromSearch

        if (!itemId || typeof itemId !== "string") return

        if (intervalRef.current) clearInterval(intervalRef.current)

        if (isTikTok) {
            fetchTikTokStats(itemId, false)
            intervalRef.current = setInterval(() => {
                fetchTikTokStats(itemId, false)
            }, 2000)
            return
        }

        if (isTwitter) {
            fetchTwitterStats(itemId, false)
            intervalRef.current = setInterval(() => {
                fetchTwitterStats(itemId, false)
            }, 2000)
            return
        }

        if (isInstagram) {
            fetchInstagramStats(itemId, false)
            intervalRef.current = setInterval(() => {
                fetchInstagramStats(itemId, false)
            }, 2000)
            return
        }

        if (isVideoMode) {
            if (itemId.startsWith("UC")) {
                setSelectedVideo(null)
                return
            }
            fetchVideoStats(itemId, false)
            intervalRef.current = setInterval(() => {
                fetchVideoStats(itemId, false)
            }, 2000)
            return
        }

        if (!itemId.startsWith("UC")) {
            setSelectedChannel(null)
            return
        }

        fetchChannelStats(itemId, false)
        intervalRef.current = setInterval(() => {
            fetchChannelStats(itemId, false)
        }, 2000)
    }, [params.id, searchParams, isVideoMode, platform])

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
        if (isVideoMode && selectedVideo) {
            // Small delay to ensure DOM is ready if switching modes
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedVideo.views)
                updateOdometer("main-views", selectedVideo.likes)
                updateOdometer("main-videos", selectedVideo.comments)
            }, 50)
        }
        if (!isVideoMode && isTikTok && selectedTikTok) {
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedTikTok.followers)
                updateOdometer("main-views", selectedTikTok.likes)
                updateOdometer("main-videos", selectedTikTok.videos)
            }, 50)
        }
        if (!isVideoMode && isTwitter && selectedTwitter) {
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedTwitter.followers)
                updateOdometer("main-views", selectedTwitter.likes)
                updateOdometer("main-videos", selectedTwitter.tweets)
            }, 50)
        }
        if (!isVideoMode && isInstagram && selectedInstagram) {
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedInstagram.followers)
                updateOdometer("main-views", selectedInstagram.likes)
                updateOdometer("main-videos", selectedInstagram.posts)
            }, 50)
        }
        if (!isVideoMode && !isTikTok && !isTwitter && !isInstagram && selectedChannel) {
            setTimeout(() => {
                updateOdometer("main-subscribers", selectedChannel.subscribers)
                updateOdometer("main-views", selectedChannel.views)
                updateOdometer("main-videos", selectedChannel.videos)
            }, 50)
        }
    }, [selectedChannel, selectedVideo, selectedTikTok, selectedTwitter, selectedInstagram, compareMode, isVideoMode, isTikTok, isTwitter, isInstagram])

    useEffect(() => {
        if (isVideoMode && compareVideo) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareVideo.views)
                updateOdometer("compare-views", compareVideo.likes)
                updateOdometer("compare-videos", compareVideo.comments)
            }, 50)
        }
        if (!isVideoMode && isTikTok && compareTikTok) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareTikTok.followers)
                updateOdometer("compare-views", compareTikTok.likes)
                updateOdometer("compare-videos", compareTikTok.videos)
            }, 50)
        }
        if (!isVideoMode && isTwitter && compareTwitter) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareTwitter.followers)
                updateOdometer("compare-views", compareTwitter.likes)
                updateOdometer("compare-videos", compareTwitter.tweets)
            }, 50)
        }
        if (!isVideoMode && isInstagram && compareInstagram) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareInstagram.followers)
                updateOdometer("compare-views", compareInstagram.likes)
                updateOdometer("compare-videos", compareInstagram.posts)
            }, 50)
        }
        if (!isVideoMode && !isTikTok && !isTwitter && !isInstagram && compareChannel) {
            setTimeout(() => {
                updateOdometer("compare-subscribers", compareChannel.subscribers)
                updateOdometer("compare-views", compareChannel.views)
                updateOdometer("compare-videos", compareChannel.videos)
            }, 50)
        }
    }, [compareChannel, compareVideo, compareTikTok, compareTwitter, compareInstagram, compareMode, isVideoMode, isTikTok, isTwitter, isInstagram])

    useEffect(() => {
        const primaryMain = isVideoMode
            ? selectedVideo?.views
            : (isTikTok ? selectedTikTok?.followers : (isTwitter ? selectedTwitter?.followers : (isInstagram ? selectedInstagram?.followers : selectedChannel?.subscribers)))
        const primaryCompare = isVideoMode
            ? compareVideo?.views
            : (isTikTok ? compareTikTok?.followers : (isTwitter ? compareTwitter?.followers : (isInstagram ? compareInstagram?.followers : compareChannel?.subscribers)))

        if (primaryMain !== undefined && primaryMain !== null && primaryCompare !== undefined && primaryCompare !== null) {
            const diff = Math.abs(primaryMain - primaryCompare)
            setPrimaryGap(primaryMain - primaryCompare)
            setTimeout(() => {
                updateOdometer("gap-difference", diff)
            }, 50)
        } else {
            setPrimaryGap(null)
        }
    }, [selectedChannel, compareChannel, selectedVideo, compareVideo, selectedTikTok, compareTikTok, selectedTwitter, compareTwitter, selectedInstagram, compareInstagram, isVideoMode, isTikTok, isTwitter, isInstagram])

    useEffect(() => {
        const compareId = searchParams.get("compare")
        if (!compareId) return
        if (isVideoMode && compareId.startsWith("UC")) return
        if (!isVideoMode && platform === "youtube" && !compareId.startsWith("UC")) return
        if (!compareMode) {
            setCompareMode(true)
        }
        if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
        if (isTikTok) {
            fetchTikTokStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchTikTokStats(compareId, true)
            }, 2000)
        } else if (isTwitter) {
            fetchTwitterStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchTwitterStats(compareId, true)
            }, 2000)
        } else if (isInstagram) {
            fetchInstagramStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchInstagramStats(compareId, true)
            }, 2000)
        } else if (isVideoMode) {
            fetchVideoStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchVideoStats(compareId, true)
            }, 2000)
        } else {
            fetchChannelStats(compareId, true)
            compareIntervalRef.current = setInterval(() => {
                fetchChannelStats(compareId, true)
            }, 2000)
        }
    }, [searchParams, compareMode, isVideoMode, platform])

    useEffect(() => {
        if (!compareMode && compareIntervalRef.current) {
            clearInterval(compareIntervalRef.current)
            compareIntervalRef.current = null
            setCompareChannel(null)
            setCompareVideo(null)
            setCompareTikTok(null)
            setCompareTwitter(null)
            setCompareInstagram(null)
            setPrimaryGap(null)
        }
    }, [compareMode])

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

    const visibleFavorites = favorites.filter((fav) =>
        (fav.type ?? "channel") === contentMode && (fav.platform ?? "youtube") === platform
    )

    const selectedDisplay = isVideoMode
        ? (selectedVideo
            ? {
                id: selectedVideo.id,
                name: selectedVideo.title,
                avatar: selectedVideo.thumbnail,
                primary: selectedVideo.views,
                secondaryA: selectedVideo.likes,
                secondaryB: selectedVideo.comments,
                meta: selectedVideo.uploadedBy,
            }
            : null)
        : (isTikTok
            ? (selectedTikTok
                ? {
                    id: selectedTikTok.id,
                    name: selectedTikTok.name,
                    avatar: selectedTikTok.avatar,
                    primary: selectedTikTok.followers,
                    secondaryA: selectedTikTok.likes,
                    secondaryB: selectedTikTok.videos,
                    meta: null,
                }
                : null)
            : (isTwitter
                ? (selectedTwitter
                    ? {
                        id: selectedTwitter.id,
                        name: selectedTwitter.name,
                        avatar: selectedTwitter.avatar,
                        primary: selectedTwitter.followers,
                        secondaryA: selectedTwitter.likes,
                        secondaryB: selectedTwitter.tweets,
                        meta: null,
                    }
                    : null)
                : (isInstagram
                    ? (selectedInstagram
                        ? {
                            id: selectedInstagram.id,
                            name: selectedInstagram.name,
                            avatar: selectedInstagram.avatar,
                            primary: selectedInstagram.followers,
                            secondaryA: selectedInstagram.likes,
                            secondaryB: selectedInstagram.posts,
                            meta: null,
                        }
                        : null)
                    : (selectedChannel
                        ? {
                            id: selectedChannel.id,
                            name: selectedChannel.name,
                            avatar: selectedChannel.avatar,
                            primary: selectedChannel.subscribers,
                            secondaryA: selectedChannel.views,
                            secondaryB: selectedChannel.videos,
                            meta: null,
                        }
                        : null))))

    const compareDisplay = isVideoMode
        ? (compareVideo
            ? {
                id: compareVideo.id,
                name: compareVideo.title,
                avatar: compareVideo.thumbnail,
                primary: compareVideo.views,
                secondaryA: compareVideo.likes,
                secondaryB: compareVideo.comments,
                meta: compareVideo.uploadedBy,
            }
            : null)
        : (isTikTok
            ? (compareTikTok
                ? {
                    id: compareTikTok.id,
                    name: compareTikTok.name,
                    avatar: compareTikTok.avatar,
                    primary: compareTikTok.followers,
                    secondaryA: compareTikTok.likes,
                    secondaryB: compareTikTok.videos,
                    meta: null,
                }
                : null)
            : (isTwitter
                ? (compareTwitter
                    ? {
                        id: compareTwitter.id,
                        name: compareTwitter.name,
                        avatar: compareTwitter.avatar,
                        primary: compareTwitter.followers,
                        secondaryA: compareTwitter.likes,
                        secondaryB: compareTwitter.tweets,
                        meta: null,
                    }
                    : null)
                : (isInstagram
                    ? (compareInstagram
                        ? {
                            id: compareInstagram.id,
                            name: compareInstagram.name,
                            avatar: compareInstagram.avatar,
                            primary: compareInstagram.followers,
                            secondaryA: compareInstagram.likes,
                            secondaryB: compareInstagram.posts,
                            meta: null,
                        }
                        : null)
                    : (compareChannel
                        ? {
                            id: compareChannel.id,
                            name: compareChannel.name,
                            avatar: compareChannel.avatar,
                            primary: compareChannel.subscribers,
                            secondaryA: compareChannel.views,
                            secondaryB: compareChannel.videos,
                            meta: null,
                        }
                        : null))))

    const primaryLabel = (isTikTok || isTwitter || isInstagram) ? "Followers" : (isVideoMode ? "Total Views" : "Total Subscribers")
    const secondaryLabelA = (isTikTok || isTwitter || isInstagram) ? "Likes" : (isVideoMode ? "Likes" : "Total Views")
    const secondaryLabelB = isTwitter ? "Tweets" : (isInstagram ? "Posts" : (isTikTok ? "Videos" : (isVideoMode ? "Comments" : "Videos")))
    const gapLabel = (isTikTok || isTwitter || isInstagram) ? "Follower Difference" : (isVideoMode ? "View Difference" : "Subscriber Difference")
    const emptyStateLabel = isTikTok ? "TikTok account" : (isTwitter ? "Twitter account" : (isInstagram ? "Instagram account" : (isVideoMode ? "video" : "channel")))
    const searchPlaceholder = isVideoMode
        ? "Search YouTube video..."
        : (isTikTok ? "Search TikTok account..." : (isTwitter ? "Search Twitter account..." : (isInstagram ? "Search Instagram account..." : "Search YouTube channel...")))
    const comparePlaceholderA = isVideoMode ? "Video 1..." : (isTikTok ? "Account 1..." : (isTwitter ? "Twitter 1..." : (isInstagram ? "Instagram 1..." : "Channel 1...")))
    const comparePlaceholderB = isVideoMode ? "Video 2..." : (isTikTok ? "Account 2..." : (isTwitter ? "Twitter 2..." : (isInstagram ? "Instagram 2..." : "Channel 2...")))

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

            <div className="border-b border-green-200/80 bg-green-100/70">
                <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] font-semibold">
                    <div className="flex items-center gap-2 text-green-900">
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
                    <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1 relative z-20">
                        <div className="aura-card p-5 bg-card/50 backdrop-blur-sm border border-border/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5 text-primary fill-primary/20" />
                                    Favorites
                                </h3>
                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{visibleFavorites.length}</span>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {visibleFavorites.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground/40 border border-dashed border-border/50 rounded-xl">
                                        <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center mx-auto mb-2">
                                            <Globe className="w-5 h-5 opacity-50" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide">Empty List</p>
                                    </div>
                                ) : (
                                    visibleFavorites.map((fav) => (
                                        <button
                                            key={fav.id}
                                            onClick={() => router.push(buildItemUrl(fav.id, (fav.type ?? "channel") as ContentMode, fav.platform ?? "youtube"))}
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
                        <div className="aura-card p-6 bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5 relative z-10">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-2xl border border-border/50 w-fit">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform</span>
                                    <Select value={platform} onValueChange={updatePlatform}>
                                        <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background/70 text-xs font-bold uppercase tracking-wide shadow-none">
                                            <SelectValue placeholder="Select platform" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl p-1">
                                            <SelectItem
                                                value="youtube"
                                                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                            >
                                                YouTube
                                            </SelectItem>
                                            <SelectItem
                                                value="twitter"
                                                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                            >
                                                Twitter / X
                                            </SelectItem>
                                            <SelectItem
                                                value="tiktok"
                                                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                            >
                                                TikTok
                                            </SelectItem>
                                            <SelectItem
                                                value="instagram"
                                                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                            >
                                                Instagram
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-2xl border border-border/50 w-fit">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mode</span>
                                    <Select value={contentMode} onValueChange={(value) => updateContentMode(value as ContentMode)}>
                                        <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background/70 text-xs font-bold uppercase tracking-wide shadow-none">
                                            <span className="flex items-center gap-2">
                                                {isVideoMode ? <Play className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                                <SelectValue placeholder="Select mode" />
                                            </span>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl p-1">
                                            <SelectItem
                                                value="channel"
                                                className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                            >
                                                Channels
                                            </SelectItem>
                                            {platform === "youtube" && (
                                                <SelectItem
                                                    value="video"
                                                    className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                                                >
                                                    Videos
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl w-fit">
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
                            </div>

                            <div className="relative">
                                {!compareMode ? (
                                    <div className="relative group">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={searchPlaceholder}
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
                                                placeholder={comparePlaceholderA}
                                                className="aura-input !pl-12 h-12 text-sm w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
                                            <input
                                                value={searchQuery2}
                                                onChange={(e) => setSearchQuery2(e.target.value)}
                                                placeholder={comparePlaceholderB}
                                                className="aura-input !pl-12 h-12 text-sm w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Search Dropdown */}
                                {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                                    <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-2xl shadow-2xl p-2 bg-background/95 backdrop-blur-xl border border-border/80 animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={`s1-${getResultId(result) || index}`}
                                                onClick={() => selectChannel(result, false)}
                                                className="w-full flex items-center gap-4 p-3 hover:bg-secondary rounded-xl text-left transition-colors group"
                                            >
                                                <img src={getResultImage(result)} className="w-10 h-10 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold text-sm truncate">{getResultTitle(result)}</div>
                                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{getResultSubtitle(result)}</div>
                                                </div>
                                            </button>
                                        ))}
                                        {compareMode && searchResults2.length > 0 && <div className="h-px bg-border my-2" />}
                                        {compareMode && searchResults2.map((result, index) => (
                                            <button
                                                key={`s2-${getResultId(result) || index}`}
                                                onClick={() => selectChannel(result, true)}
                                                className="w-full flex items-center gap-4 p-3 hover:bg-secondary rounded-xl text-left transition-colors group"
                                            >
                                                <img src={getResultImage(result)} className="w-10 h-10 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform border border-primary/20" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="font-bold text-sm truncate text-primary">{getResultTitle(result)}</div>
                                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{getResultSubtitle(result)}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Display */}
                        {selectedDisplay ? (
                            <div className="space-y-8">
                                <div className={`grid ${compareMode && compareDisplay ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>

                                    {/* Channel 1 */}
                                    <div className="aura-card p-8 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                            <img src={selectedDisplay.avatar} className="w-32 h-32 rounded-3xl relative z-10 shadow-2xl border-4 border-background group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute -bottom-3 -right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg z-20 animate-pulse">
                                                Live
                                            </div>
                                        </div>

                                        <h2 className="text-3xl font-black mb-1 leading-tight">{selectedDisplay.name}</h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{selectedDisplay.id}</p>
                                        {selectedDisplay.meta ? (
                                            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-6">Uploaded by {selectedDisplay.meta}</p>
                                        ) : (
                                            <div className="mb-6" />
                                        )}

                                        <div className="flex gap-3 mb-8">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleFavorite({ id: selectedDisplay.id, name: selectedDisplay.name, avatar: selectedDisplay.avatar })}
                                                className="rounded-full h-8 px-4 text-xs font-bold gap-2"
                                            >
                                                <Star className={`w-3.5 h-3.5 ${isFavoriteItem(selectedDisplay.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                                {isFavoriteItem(selectedDisplay.id) ? 'Saved' : 'Save'}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-full h-8 w-8 p-0">
                                                <Share2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <div className="w-full py-8 bg-secondary/20 rounded-3xl border border-border/50 mb-6 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-grid-white/5 mask-image-b" />
                                            <div className="relative z-10">
                                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-2">{primaryLabel}</div>
                                                <div id="main-subscribers" key={`main-subscribers-${compareMode}`} className={`font-black tabular-nums tracking-tighter leading-none whitespace-nowrap ${compareMode ? 'text-5xl lg:text-6xl' : 'text-7xl lg:text-8xl'}`}>
                                                </div>
                                            </div>
                                        </div>

                                        <MilestoneTracker current={selectedDisplay.primary} goal={getNextMilestone(selectedDisplay.primary)} />

                                        <div className="grid grid-cols-2 w-full gap-4 mt-8 pt-8 border-t border-border/50">
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{secondaryLabelA}</div>
                                                <div id="main-views" key={`main-views-${compareMode}`} className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{secondaryLabelB}</div>
                                                <div id="main-videos" key={`main-videos-${compareMode}`} className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Channel 2 */}
                                    {compareMode && compareDisplay && (
                                        <div className="aura-card p-8 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
                                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                                <img src={compareDisplay.avatar} className="w-32 h-32 rounded-3xl relative z-10 shadow-2xl border-4 border-background group-hover:scale-105 transition-transform duration-500" />
                                            </div>

                                            <h2 className="text-3xl font-black mb-1 leading-tight">{compareDisplay.name}</h2>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{compareDisplay.id}</p>
                                            {compareDisplay.meta ? (
                                                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-6">Uploaded by {compareDisplay.meta}</p>
                                            ) : (
                                                <div className="mb-6" />
                                            )}

                                            <div className="flex gap-3 mb-8">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleFavorite({ id: compareDisplay.id, name: compareDisplay.name, avatar: compareDisplay.avatar })}
                                                    className="rounded-full h-8 px-4 text-xs font-bold gap-2"
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${isFavoriteItem(compareDisplay.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                                    {isFavoriteItem(compareDisplay.id) ? 'Saved' : 'Save'}
                                                </Button>
                                            </div>

                                            <div className="w-full py-8 bg-secondary/20 rounded-3xl border border-border/50 mb-6 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-grid-white/5 mask-image-b" />
                                                <div className="relative z-10">
                                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-2">{primaryLabel}</div>
                                                    <div id="compare-subscribers" key="compare-subscribers" className="text-5xl lg:text-6xl font-black tabular-nums tracking-tighter leading-none text-primary whitespace-nowrap">
                                                    </div>
                                                </div>
                                            </div>

                                            <MilestoneTracker current={compareDisplay.primary} goal={getNextMilestone(compareDisplay.primary)} />

                                            <div className="grid grid-cols-2 w-full gap-4 mt-8 pt-8 border-t border-border/50">
                                                <div>
                                                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{secondaryLabelA}</div>
                                                    <div id="compare-views" className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{secondaryLabelB}</div>
                                                    <div id="compare-videos" className="text-2xl font-bold tabular-nums whitespace-nowrap"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Comparison Analytics Header */}
                                {compareMode && selectedDisplay && compareDisplay && primaryGap !== null && (
                                    <div className="aura-card p-8 bg-gradient-to-br from-card to-secondary/20 border-primary/10 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
                                            <Activity className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-[0.3em]">Gap Analysis</span>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                                            <div className="text-center">
                                                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{gapLabel}</div>
                                                <div className="text-5xl md:text-6xl font-black tracking-tighter tabular-nums flex items-center justify-center gap-3 whitespace-nowrap">
                                                    {primaryGap > 0 ? <TrendingUp className="w-8 h-8 text-green-500" /> : <TrendingDown className="w-8 h-8 text-red-500" />}
                                                    <div id="gap-difference"></div>
                                                </div>
                                                <div className="mt-2 text-xs font-bold bg-primary/10 text-primary py-1 px-3 rounded-full inline-block">
                                                    {primaryGap > 0 ? `${selectedDisplay.name} leads` : `${compareDisplay.name} leads`}
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
                                    Search for any {platform === "youtube" ? "YouTube " : ""}{emptyStateLabel} above to see real-time statistics, future projections, and detailed comparisons.
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
    const params = useParams()
    const idParam = params?.id
    const key = Array.isArray(idParam) ? idParam.join("-") : (idParam || "home")

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing System</div>
                </div>
            </div>
        }>
            <DockyCount key={key} />
        </Suspense>
    )
}
