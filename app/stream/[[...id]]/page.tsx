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
    const searchParams = useSearchParams()
    const pathname = usePathname()

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
    const isDark = searchParams.get("theme") === "dark"

    const [display, setDisplay] = useState<StreamDisplay | null>(null)
    const [counterSize, setCounterSize] = useState<CounterSize>("normal")
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [odometerReady, setOdometerReady] = useState(false)

    const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

    const toggleDarkMode = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (isDark) {
            params.delete("theme")
        } else {
            params.set("theme", "dark")
        }
        const query = params.toString()
        router.replace(`${pathname}${query ? `?${query}` : ""}`)
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
        if (!display) return
        display.stats.forEach((stat, index) => {
            const id = `stream-odometer-${index}`
            const element = document.getElementById(id)
            if (element) element.textContent = stat.value.toLocaleString()
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

    // Load Odometer once (script + default theme CSS) to keep digits inline
    useEffect(() => {
        if (odometerReady) return
        if (typeof window === "undefined") return

        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/odometer.min.js"
        script.async = true
        script.onload = () => setOdometerReady(true)
        document.body.appendChild(script)

        const css = document.createElement("link")
        css.rel = "stylesheet"
        css.href = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/themes/odometer-theme-default.css"
        document.head.appendChild(css)

        // Hard guarantee that digits stay on a single line even if the CDN theme fails to load
        const style = document.createElement("style")
        style.innerHTML = `
            .odometer {
                white-space: nowrap !important;
                display: inline-flex;
                gap: 0;
                line-height: 1;
            }
            .odometer-digit {
                display: inline-block !important;
                position: relative;
                vertical-align: middle;
                overflow: hidden;
            }
            .odometer-digit .odometer-digit-spacer {
                display: inline-block !important;
                visibility: hidden;
            }
            .odometer-digit .odometer-digit-inner {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
            }
            .odometer-digit .odometer-ribbon,
            .odometer-digit .odometer-ribbon-inner,
            .odometer-digit .odometer-value {
                display: inline-block;
            }
        `
        document.head.appendChild(style)

        return () => {
            try { document.body.removeChild(script) } catch { }
            try { document.head.removeChild(css) } catch { }
            try { document.head.removeChild(style) } catch { }
        }
    }, [odometerReady])

    // Update odometer numbers
    useEffect(() => {
        if (!display) return
        display.stats.forEach((stat, index) => {
            const id = `stream-odometer-${index}`
            const el = document.getElementById(id)
            if (!el) return
            if (odometerReady && (window as any).Odometer) {
                const existing = (el as any).__odometerInstance as any
                if (existing) {
                    existing.update(stat.value)
                } else {
                    el.innerHTML = ""
                    const inst = new (window as any).Odometer({
                        el,
                        value: stat.value,
                        format: "(,ddd)",
                        theme: "default",
                        duration: 2000,
                    })
                    ;(el as any).__odometerInstance = inst
                }
            } else {
                el.textContent = stat.value.toLocaleString()
            }
        })
    }, [display, odometerReady])

    return (
        <div className={isDark ? "min-h-screen bg-black text-zinc-400" : "min-h-screen bg-background text-foreground"}>
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl border ${isDark ? "bg-black border-[#111]" : "bg-secondary/50 border-border/50"}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-muted-foreground"}`}>Size</span>
                        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? "bg-black border border-[#111]" : "bg-background/70"}`}>
                            {(["normal", "large", "xl"] as CounterSize[]).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setCounterSize(size)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        counterSize === size
                                            ? isDark ? "bg-white/10 text-zinc-200" : "bg-primary/10 text-primary"
                                            : isDark ? "text-zinc-500 hover:text-zinc-200" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {size === "normal" ? "S" : size === "large" ? "M" : "L"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${isDark ? "bg-black text-zinc-300 border-[#111]" : "bg-secondary/50 text-muted-foreground border-border/50 hover:text-foreground"}`}
                    >
                        Dark {isDark ? "On" : "Off"}
                    </button>
                    <Select value={platform} onValueChange={updatePlatform}>
                        <SelectTrigger className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wide shadow-none ${isDark ? "border-[#111] bg-black text-zinc-200" : "border-border/60 bg-background/70"}`}>
                            <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent className={`rounded-2xl p-1 ${isDark ? "border-[#111] bg-black text-zinc-200" : "border-border/80 bg-background/95 backdrop-blur-xl"}`}>
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
                            <SelectTrigger className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wide shadow-none ${isDark ? "border-[#111] bg-black text-zinc-200" : "border-border/60 bg-background/70"}`}>
                                <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent className={`rounded-2xl p-1 ${isDark ? "border-[#111] bg-black text-zinc-200" : "border-border/80 bg-background/95 backdrop-blur-xl"}`}>
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
                            className={`aura-input !pl-9 h-10 text-sm w-full transition-all ${isDark ? "bg-black border-[#111] text-zinc-200 placeholder:text-zinc-600 hover:bg-black focus:bg-black" : "bg-secondary/30 hover:bg-secondary/50 focus:bg-background"}`}
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
                                <div className={`text-3xl font-black tracking-tight ${isDark ? "text-zinc-300" : ""}`}>{display.name}</div>
                                <div className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-600" : "text-muted-foreground"}`}>{display.id}</div>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {display.stats.map((stat, index) => (
                                <div
                                    key={`${stat.label}-${index}`}
                                    className={`p-5 text-center border overflow-hidden rounded-3xl ${isDark ? "bg-black border-[#111]" : "aura-card border-border/60 bg-card/60"}`}
                                >
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-zinc-600" : "text-muted-foreground"}`}>
                                        {stat.label}
                                    </div>
                                    <div
                                        id={`stream-odometer-${index}`}
                                        className={`${unifiedSizeClass} font-black tabular-nums tracking-tighter leading-none whitespace-nowrap mt-3 ${isDark ? "text-white" : ""}`}
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
