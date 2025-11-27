"use client"

import { useState, useEffect, useRef } from "react"
import { initializeApp } from "firebase/app"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Star, LogOut, TrendingUp, TrendingDown, Users, Eye, Video, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AdPlaceholder } from "@/components/AdPlaceholder"

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

export default function DockyCount() {
  const [user, setUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchQuery2, setSearchQuery2] = useState("") // Added searchQuery2 for compare mode second search bar
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchResults2, setSearchResults2] = useState<any[]>([]) // Added searchResults2 for compare mode second search bar
  const [selectedChannel, setSelectedChannel] = useState<ChannelData | null>(null)
  const [compareChannel, setCompareChannel] = useState<ChannelData | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [usageTime, setUsageTime] = useState(0)
  const [showLimitOverlay, setShowLimitOverlay] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const compareIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const usageIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const odometerLoadedRef = useRef(false)

  const { toast } = useToast()

  // Load Odometer.js library
  useEffect(() => {
    if (typeof window !== "undefined" && !odometerLoadedRef.current) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/odometer@0.4.8/odometer.min.js"
      script.async = true
      document.body.appendChild(script)
      odometerLoadedRef.current = true
    }
  }, [])

  // Auth state listener
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

  // Usage time tracker
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
          // 1 hour = 3600 seconds
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

  // Load user favorites from Firestore
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

  // Save favorites to Firestore
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

  // Google Sign In
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

  // Sign Out
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

  // Search channels
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

      if (data.list && data.list.length > 0) {
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

      if (data.list && data.list.length > 0) {
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

  // Debounced search
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

  // Fetch channel stats
  const fetchChannelStats = async (channelId: string, isCompare = false) => {
    try {
      const response = await fetch(`https://backend.mixerno.space/api/youtube/estv3/${channelId}`)
      const data = await response.json()

      if (data.items && data.items.length > 0) {
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

  // Update odometer
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

  // Select channel
  const selectChannel = (result: any, isCompare = false) => {
    const channelId = result[2]

    if (isCompare) {
      if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
      fetchChannelStats(channelId, true)
      compareIntervalRef.current = setInterval(() => {
        fetchChannelStats(channelId, true)
      }, 2000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      fetchChannelStats(channelId, false)
      intervalRef.current = setInterval(() => {
        fetchChannelStats(channelId, false)
      }, 2000)
    }

    setSearchResults([])
    setSearchQuery("")
    setSearchResults2([]) // Clear second search results
    setSearchQuery2("") // Clear second search query
  }

  // Toggle favorite
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

  // Cleanup intervals
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Toaster />

      {/* Limit Overlay */}
      {showLimitOverlay && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full bg-card border-destructive/50 shadow-2xl shadow-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive text-2xl">Usage limit reached</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">You have reached the daily usage limit of 1 hour.</p>
              <p className="text-muted-foreground text-sm">Come back tomorrow to continue using DockyCount!</p>
              <Button onClick={() => window.location.reload()} className="w-full" variant="destructive">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20 text-white">
              DC
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DockyCount
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-white/5">
              Time: <span className="text-foreground font-medium">{formatTime(usageTime)}</span> / 1h
            </div>

            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <img
                  src={user.photoURL || ""}
                  alt={user.displayName || ""}
                  className="w-8 h-8 rounded-full ring-2 ring-primary/20"
                />
                <span className="text-sm font-medium hidden md:block">{user.displayName}</span>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleSignIn} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  Favorites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {favorites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>No favorites yet</p>
                    <p className="text-xs mt-1 opacity-50">Search and star channels to add them here</p>
                  </div>
                ) : (
                  favorites.map((fav) => (
                    <button
                      key={fav.id}
                      onClick={() => {
                        if (intervalRef.current) clearInterval(intervalRef.current)
                        fetchChannelStats(fav.id, false)
                        intervalRef.current = setInterval(() => {
                          fetchChannelStats(fav.id, false)
                        }, 2000)
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all group text-left"
                    >
                      <img src={fav.avatar || "/placeholder.svg"} alt={fav.name} className="w-8 h-8 rounded-full ring-1 ring-white/10 group-hover:ring-primary/50 transition-all" />
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{fav.name}</span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <AdPlaceholder className="h-[250px] hidden lg:flex" />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-8">
            <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 pointer-events-none" />
              <CardContent className="pt-6 relative">
                <div className="flex gap-2 mb-6 p-1 bg-black/20 rounded-xl w-fit">
                  <button
                    onClick={() => setCompareMode(false)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${!compareMode
                      ? "bg-primary text-white shadow-lg"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                      }`}
                  >
                    Simple Mode
                  </button>
                  <button
                    onClick={() => setCompareMode(true)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${compareMode
                      ? "bg-purple-600 text-white shadow-lg"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                      }`}
                  >
                    Compare Mode
                  </button>
                </div>

                {!compareMode ? (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a YouTube channel..."
                      className="pl-12 h-14 bg-black/20 border-white/10 focus:border-primary/50 text-lg placeholder:text-muted-foreground/50 rounded-xl transition-all"
                    />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="First channel..."
                        className="pl-12 h-12 bg-black/20 border-white/10 focus:border-primary/50 placeholder:text-muted-foreground/50 rounded-xl"
                      />
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
                      <Input
                        value={searchQuery2}
                        onChange={(e) => setSearchQuery2(e.target.value)}
                        placeholder="Second channel..."
                        className="pl-12 h-12 bg-black/20 border-white/10 focus:border-purple-500/50 placeholder:text-muted-foreground/50 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Search Results Dropdown */}
                {(searchResults.length > 0 || (compareMode && searchResults2.length > 0)) && (
                  <div className="mt-4 grid gap-4">
                    {searchResults.length > 0 && (
                      <div className="bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => selectChannel(result, false)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-primary/10 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-12 h-12 rounded-full ring-2 ring-white/10" />
                            <div className="flex-1">
                              <div className="font-bold text-foreground">{result[0]}</div>
                              <div className="text-sm text-muted-foreground">{result[1]}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {compareMode && searchResults2.length > 0 && (
                      <div className="bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20">
                        {searchResults2.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => selectChannel(result, true)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-purple-500/10 transition-colors text-left border-b border-white/5 last:border-0"
                          >
                            <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-12 h-12 rounded-full ring-2 ring-white/10" />
                            <div className="flex-1">
                              <div className="font-bold text-foreground">{result[0]}</div>
                              <div className="text-sm text-muted-foreground">{result[1]}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <AdPlaceholder className="h-[120px]" />

            {/* Channel Stats */}
            <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>
              {/* Main Channel */}
              {selectedChannel && (
                <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600" />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={selectedChannel.avatar || "/placeholder.svg"}
                            alt={selectedChannel.name}
                            className="w-16 h-16 rounded-full ring-4 ring-black/50 shadow-xl"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">LIVE</div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">{selectedChannel.name}</CardTitle>
                          <div className="text-sm text-muted-foreground">YouTube Channel</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleFavorite(selectedChannel)}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-white/10"
                        >
                          <Star
                            className={`w-6 h-6 transition-all ${favorites.some((f) => f.id === selectedChannel.id)
                              ? "fill-yellow-400 text-yellow-400 scale-110"
                              : "text-muted-foreground"
                              }`}
                          />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedChannel(null)
                            if (intervalRef.current) clearInterval(intervalRef.current)
                          }}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-white/10 hover:text-destructive"
                        >
                          <X className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary mb-2 uppercase tracking-wider">
                          <Users className="w-4 h-4" />
                          <span>Subscribers</span>
                        </div>
                        <div
                          id="main-subscribers"
                          className="text-6xl md:text-7xl font-[family-name:var(--font-roboto-black)] text-white tracking-tight"
                        >
                          0
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2 uppercase">
                          <Eye className="w-3 h-3" />
                          <span>Total Views</span>
                        </div>
                        <div
                          id="main-views"
                          className="text-xl md:text-2xl font-[family-name:var(--font-roboto-black)] text-white/90"
                        >
                          0
                        </div>
                      </div>

                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2 uppercase">
                          <Video className="w-3 h-3" />
                          <span>Videos</span>
                        </div>
                        <div
                          id="main-videos"
                          className="text-xl md:text-2xl font-[family-name:var(--font-roboto-black)] text-white/90"
                        >
                          0
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compare Channel */}
              {compareMode && compareChannel && (
                <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600" />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={compareChannel.avatar || "/placeholder.svg"}
                            alt={compareChannel.name}
                            className="w-16 h-16 rounded-full ring-4 ring-black/50 shadow-xl"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">LIVE</div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">{compareChannel.name}</CardTitle>
                          <div className="text-sm text-muted-foreground">YouTube Channel</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setCompareChannel(null)
                          if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
                        }}
                        variant="ghost"
                        size="icon"
                        className="hover:bg-white/10 hover:text-destructive"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-purple-400 mb-2 uppercase tracking-wider">
                          <Users className="w-4 h-4" />
                          <span>Subscribers</span>
                        </div>
                        <div
                          id="compare-subscribers"
                          className="text-6xl md:text-7xl font-[family-name:var(--font-roboto-black)] text-white tracking-tight"
                        >
                          0
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2 uppercase">
                          <Eye className="w-3 h-3" />
                          <span>Total Views</span>
                        </div>
                        <div
                          id="compare-views"
                          className="text-xl md:text-2xl font-[family-name:var(--font-roboto-black)] text-white/90"
                        >
                          0
                        </div>
                      </div>

                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2 uppercase">
                          <Video className="w-3 h-3" />
                          <span>Videos</span>
                        </div>
                        <div
                          id="compare-videos"
                          className="text-xl md:text-2xl font-[family-name:var(--font-roboto-black)] text-white/90"
                        >
                          0
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Comparison Stats */}
            {compareMode && selectedChannel && compareChannel && (
              <Card className="bg-card/50 backdrop-blur-md border-white/5 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Comparison Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-black/20 rounded-xl p-6 border border-white/5 flex flex-col items-center text-center">
                      <div className="text-sm text-muted-foreground mb-3">Subscriber Difference</div>
                      <div className="flex items-center gap-3">
                        {selectedChannel.subscribers > compareChannel.subscribers ? (
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-400" />
                        )}
                        <span className="text-3xl font-bold font-[family-name:var(--font-roboto-black)]">
                          {Math.abs(selectedChannel.subscribers - compareChannel.subscribers).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {selectedChannel.subscribers > compareChannel.subscribers
                          ? `${selectedChannel.name} leads`
                          : `${compareChannel.name} leads`}
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-6 border border-white/5 flex flex-col items-center text-center">
                      <div className="text-sm text-muted-foreground mb-3">View Difference</div>
                      <div className="flex items-center gap-3">
                        {selectedChannel.views > compareChannel.views ? (
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-400" />
                        )}
                        <span className="text-2xl font-bold font-[family-name:var(--font-roboto-black)]">
                          {Math.abs(selectedChannel.views - compareChannel.views).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-6 border border-white/5 flex flex-col items-center text-center">
                      <div className="text-sm text-muted-foreground mb-3">Video Difference</div>
                      <div className="flex items-center gap-3">
                        {selectedChannel.videos > compareChannel.videos ? (
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-400" />
                        )}
                        <span className="text-2xl font-bold font-[family-name:var(--font-roboto-black)]">
                          {Math.abs(selectedChannel.videos - compareChannel.videos).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SEO Content Section */}
            <div className="mt-12 space-y-8">
              <section className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold text-white mb-4">Real-Time YouTube Subscriber Count</h2>
                <p className="text-gray-400 leading-relaxed">
                  DockyCount provides the most accurate and up-to-date real-time subscriber count for YouTube channels.
                  Unlike the abbreviated counts shown on YouTube, our tool connects directly to the API to show you the
                  live numbers as they happen. Whether you're a creator tracking your milestones or a fan watching a
                  subscriber battle, DockyCount is the ultimate tool for YouTube analytics.
                </p>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                <section className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-bold text-white mb-3">Why Use DockyCount?</h3>
                  <ul className="text-gray-400 space-y-2 list-disc pl-5">
                    <li>Instant updates every 2 seconds</li>
                    <li>Compare two channels side-by-side</li>
                    <li>Track views and video counts</li>
                    <li>Save your favorite channels</li>
                    <li>Beautiful, distraction-free dark mode interface</li>
                  </ul>
                </section>

                <section className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-bold text-white mb-3">How It Works</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Simply enter the name or URL of any YouTube channel in the search bar above. Our system instantly
                    fetches the channel's data and establishes a live connection to track changes. You can watch the
                    numbers roll in real-time with our smooth odometer animation.
                  </p>
                </section>
              </div>
            </div>

            <AdPlaceholder className="h-[100px]" />
          </main>
        </div>
      </div>
    </div>
  )
}
