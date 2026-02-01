"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ContentMode = "channel" | "video"

interface StreamDisplay {
    id: string
    name: string
    avatar?: string
    stats: { label: string, value: number }[]
}

type CounterSize = "normal" | "large" | "xl"

export const dynamic = "force-dynamic"
export const runtime = "edge"

function parseCount(value: unknown) {
    if (value === null || value === undefined) return null
    if (typeof value === "number") return Number.isFinite(value) ? value : null
    if (typeof value === "string") {
        const normalized = value.replace(/,/g, "")
        const parsed = Number.parseInt(normalized, 10)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function getCount(counts: any[], key: string) {
    if (!counts || !Array.isArray(counts)) return null
    const entry = counts.find((item) => item?.value === key)
    return parseCount(entry?.count)
}

function getUserValue(user: any[], key: string) {
    if (!user || !Array.isArray(user)) return null
    const entry = user.find((item) => item?.value === key)
    return typeof entry?.count === "string" ? entry.count : null
}

function StreamView() {
    const params = useParams()
    const router = useRouter()

    const rawSegments = params.id ? (Array.isArray(params.id) ? params.id : [params.id]) : []
    const pathSegments = rawSegments.filter((segment): segment is string => Boolean(segment))

    let pathPlatform: string | null = null
    let pathMode: ContentMode | null = null
    let pathId: string | null = null

    if (pathSegments.length > 0) {
        if (pathSegments[0] === "youtube") {
            pathPlatform = "youtube"
            if (pathSegments[1] === "channel" || pathSegments[1] === "video") {
                pathMode = pathSegments[1] === "video" ? "video" : "channel"
                pathId = pathSegments[2] ?? null
            } else {
                pathMode = "channel"
                pathId = pathSegments[1] ?? null
            }
        } else if (pathSegments[0] === "tiktok") {
            pathPlatform = "tiktok"
            pathMode = "channel"
            pathId = pathSegments[1] ?? null
        } else {
            pathId = pathSegments[0] ?? null
        }
    }

    const platform = pathPlatform ?? "youtube"
    const contentMode: ContentMode = platform === "youtube" ? (pathMode ?? "channel") : "channel"
    const isVideoMode = contentMode === "video"
    const currentId = pathId

    const [display, setDisplay] = useState<StreamDisplay | null>(null)
    const [counterSize, setCounterSize] = useState<CounterSize>("normal")
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const odometerLoadedRef = useRef(false)
    const odometerRefs = useRef<{ [key: string]: any }>({})

    const buildBasePath = (targetPlatform: string, targetMode: ContentMode) => {
        if (targetPlatform === "youtube") {
            return targetMode === "video" ? "/stream/youtube/video" : "/stream/youtube/channel"
        }
        return `/stream/${targetPlatform}`
    }

    const buildStreamUrl = (id: string, targetPlatform = platform, targetMode = contentMode) => {
        const base = buildBasePath(targetPlatform, targetMode)
        return `${base}/${id}`
    }

    const updatePlatform = (value: string) => {
        const nextPlatform = value || "youtube"
        const nextMode = nextPlatform === "youtube" ? contentMode : "channel"
        const basePath = buildBasePath(nextPlatform, nextMode)
        const nextPath = currentId ? `${basePath}/${currentId}` : basePath
        router.replace(nextPath)
    }

    const updateMode = (value: ContentMode) => {
        if (platform !== "youtube" && value === "video") return
        const basePath = buildBasePath(platform, value)
        const nextPath = currentId ? `${basePath}/${currentId}` : basePath
        router.replace(nextPath)
    }

    const getResultId = (result: any) => result?.[2] ?? ""
    const getResultTitle = (result: any) => result?.[0] ?? ""
    const getResultImage = (result: any) => {
        if (platform === "tiktok" || isVideoMode) return result?.[1] ?? ""
        return result?.[3] ?? ""
    }
    const getUnifiedStatSizeClass = (stats: { value: number }[], size: CounterSize) => {
        const maxDigits = stats.reduce((max, stat) => {
            const digits = String(Math.abs(stat.value)).length
            return Math.max(max, digits)
        }, 0)
        const sizes = {
            normal: {
                huge: "text-[clamp(1.6rem,3.2vw,2.9rem)]",
                large: "text-[clamp(1.9rem,3.6vw,3.2rem)]",
                medium: "text-[clamp(2.2rem,4vw,3.6rem)]",
                small: "text-[clamp(2.6rem,4.6vw,4.2rem)]",
            },
            large: {
                huge: "text-[clamp(1.9rem,3.6vw,3.2rem)]",
                large: "text-[clamp(2.2rem,4vw,3.6rem)]",
                medium: "text-[clamp(2.6rem,4.6vw,4.1rem)]",
                small: "text-[clamp(3rem,5.2vw,4.8rem)]",
            },
            xl: {
                huge: "text-[clamp(2rem,4vw,3.5rem)]",
                large: "text-[clamp(2.4rem,4.4vw,3.9rem)]",
                medium: "text-[clamp(2.8rem,5vw,4.4rem)]",
                small: "text-[clamp(3.2rem,5.8vw,5.2rem)]",
            },
        }
        const map = sizes[size]
        if (maxDigits >= 12) return map.huge
        if (maxDigits >= 10) return map.large
        if (maxDigits >= 8) return map.medium
        return map.small
    }

    useEffect(() => {
        if (!currentId) {
            setDisplay(null)
            if (intervalRef.current) clearInterval(intervalRef.current)
            return
        }

        if (intervalRef.current) clearInterval(intervalRef.current)

        const fetchData = async () => {
            try {
                if (platform === "tiktok") {
                    const response = await fetch(`/api/tiktok-stats/${currentId}`)
                    const data = await response.json()
                    const name = getUserValue(data.user, "name") || currentId
                    const avatar = getUserValue(data.user, "pfp") || getUserValue(data.user, "banner") || ""
                    setDisplay({
                        id: currentId,
                        name,
                        avatar,
                        stats: [
                            { label: "Followers", value: getCount(data.counts, "followers") ?? 0 },
                            { label: "Likes", value: getCount(data.counts, "likes") ?? 0 },
                            { label: "Videos", value: getCount(data.counts, "videos") ?? 0 },
                        ],
                    })
                    return
                }

                if (isVideoMode) {
                    const response = await fetch(`/api/video-stats/${currentId}`)
                    const data = await response.json()
                    const title = getUserValue(data.user, "name") || "Video"
                    const thumbnail = getUserValue(data.user, "pfp") || getUserValue(data.user, "banner") || ""
                    setDisplay({
                        id: currentId,
                        name: title,
                        avatar: thumbnail,
                        stats: [
                            { label: "Views", value: getCount(data.counts, "views") ?? 0 },
                            { label: "Likes", value: getCount(data.counts, "likes") ?? 0 },
                            { label: "Comments", value: getCount(data.counts, "comments") ?? 0 },
                        ],
                    })
                    return
                }

                const response = await fetch(`/api/stats/${currentId}`)
                const data = await response.json()
                if (data?.items?.length) {
                    const item = data.items[0]
                    const subscribers = Number.parseInt(item.statistics.subscriberCount)
                    const views = Number.parseInt(item.statistics.viewCount)
                    const videos = Number.parseInt(item.statistics.videoCount)
                    setDisplay({
                        id: currentId,
                        name: item.snippet.title,
                        avatar: item.snippet.thumbnails?.default?.url,
                        stats: [
                            { label: "Subscribers", value: Number.isFinite(subscribers) ? subscribers : 0 },
                            { label: "Views", value: Number.isFinite(views) ? views : 0 },
                            { label: "Videos", value: Number.isFinite(videos) ? videos : 0 },
                        ],
                    })
                }
            } catch (error) {
                console.error("Stream fetch error:", error)
            }
        }

        fetchData()
        intervalRef.current = setInterval(fetchData, 2000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [currentId, platform, isVideoMode])

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

        const style = document.createElement("style")
        style.innerHTML = `
            .odometer.odometer-auto-theme, .odometer.odometer-theme-default {
                display: inline-block;
                vertical-align: middle;
                position: relative;
                white-space: nowrap !important;
                line-height: 1;
            }
            .odometer.odometer-auto-theme .odometer-digit, .odometer.odometer-theme-default .odometer-digit {
                display: inline-block !important;
                vertical-align: middle;
                position: relative;
                overflow: hidden;
            }
            .odometer.odometer-auto-theme .odometer-digit .odometer-digit-spacer, .odometer.odometer-theme-default .odometer-digit .odometer-digit-spacer {
                display: inline-block !important;
                vertical-align: middle;
                visibility: hidden;
            }
            .odometer.odometer-auto-theme .odometer-digit .odometer-ribbon, .odometer.odometer-theme-default .odometer-digit .odometer-ribbon {
                display: block;
                position: relative;
            }
            .odometer.odometer-auto-theme .odometer-value, .odometer.odometer-theme-default .odometer-value {
                display: block;
                line-height: 1;
            }
        `
        document.head.appendChild(style)
        return () => {
            try { document.head.removeChild(style) } catch { }
        }
    }, [])

    useEffect(() => {
        if (!display) return
        display.stats.forEach((stat, index) => {
            const id = `stream-odometer-${index}`
            const element = document.getElementById(id)
            if (!element || typeof window === "undefined" || !(window as any).Odometer) {
                if (element) element.textContent = stat.value.toLocaleString()
                return
            }
            if (!odometerRefs.current[id] || odometerRefs.current[id].el !== element) {
                odometerRefs.current[id] = new (window as any).Odometer({
                    el: element,
                    value: stat.value,
                    format: "(,ddd)",
                    theme: "default",
                    duration: 500
                })
            } else {
                odometerRefs.current[id].update(stat.value)
            }
        })
    }, [display])

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setSearchResults([])
                return
            }
            try {
                const endpoint = platform === "tiktok"
                    ? "/api/tiktok-search"
                    : (isVideoMode ? "/api/video-search" : "/api/search")
                const response = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}`)
                const data = await response.json()
                setSearchResults(data?.list?.slice(0, 6) ?? [])
            } catch (error) {
                console.error("Stream search error:", error)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, platform, isVideoMode])

    const unifiedSizeClass = display ? getUnifiedStatSizeClass(display.stats, counterSize) : ""

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-2xl border border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Size</span>
                        <div className="flex gap-1 p-1 bg-background/70 rounded-xl">
                            {(["normal", "large", "xl"] as CounterSize[]).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setCounterSize(size)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${counterSize === size ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {size === "normal" ? "S" : size === "large" ? "M" : "L"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Select value={platform} onValueChange={updatePlatform}>
                        <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background/70 text-xs font-bold uppercase tracking-wide shadow-none">
                            <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl p-1">
                            <SelectItem value="youtube" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary">
                                YouTube
                            </SelectItem>
                            <SelectItem value="tiktok" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary">
                                TikTok
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {platform === "youtube" && (
                        <Select value={contentMode} onValueChange={(value) => updateMode(value as ContentMode)}>
                            <SelectTrigger className="h-9 rounded-xl border-border/60 bg-background/70 text-xs font-bold uppercase tracking-wide shadow-none">
                                <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/80 bg-background/95 backdrop-blur-xl p-1">
                                <SelectItem value="channel" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary">
                                    Channel
                                </SelectItem>
                                <SelectItem value="video" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide data-[highlighted]:bg-secondary/70 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary">
                                    Video
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={platform === "tiktok" ? "Search TikTok account..." : (isVideoMode ? "Search YouTube video..." : "Search YouTube channel...")}
                            className="aura-input !pl-9 h-10 text-sm w-full bg-secondary/30 hover:bg-secondary/50 focus:bg-background transition-all"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-2xl shadow-2xl p-2 bg-background/95 backdrop-blur-xl border border-border/80">
                                {searchResults.map((result, index) => (
                                    <button
                                        key={`${getResultId(result) || index}`}
                                        onClick={() => {
                                            const id = getResultId(result)
                                            if (!id) return
                                            router.push(buildStreamUrl(id))
                                            setSearchResults([])
                                            setSearchQuery("")
                                        }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-xl text-left transition-colors"
                                    >
                                        <img src={getResultImage(result)} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                                        <div className="font-bold text-sm truncate">{getResultTitle(result)}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {display ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            {display.avatar && (
                                <img src={display.avatar} alt={display.name} className="w-14 h-14 rounded-2xl shadow-lg border border-border/60" />
                            )}
                            <div>
                                <div className="text-3xl font-black tracking-tight">{display.name}</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{display.id}</div>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {display.stats.map((stat, index) => (
                                <div key={`${stat.label}-${index}`} className="aura-card p-5 text-center border border-border/60 bg-card/60 overflow-hidden">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                                    <div
                                        id={`stream-odometer-${index}`}
                                        className={`${unifiedSizeClass} font-black tabular-nums tracking-tighter leading-none mt-3`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="aura-card p-12 text-center border border-dashed border-border/60 bg-secondary/5">
                        <div className="text-lg font-bold text-muted-foreground">Select an account to start</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function StreamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <StreamView />
        </Suspense>
    )
}
