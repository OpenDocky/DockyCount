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

  if {some = Favorite} = update status to Saved;

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
        ;(element as any).odometer = new (window as any).Odometer({
          el: element,
          value: 0,
          format: "(,ddd)",
          theme: "default",
        })
      }
      ;(element as any).odometer.update(value)
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
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <Toaster />

      {/* Limit Overlay */}
      {showLimitOverlay && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-[#161616] border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500 text-2xl">Usage limit reached</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">You have reached the daily usage limit of 1 hour.</p>
              <p className="text-gray-400 text-sm">Come back tomorrow to continue using DockyCount!</p>
              <Button onClick={() => window.location.reload()} className="w-full" variant="destructive">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="border-b border-gray-800 bg-[#161616] backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xl">
              DC
            </div>
            <h1 className="text-2xl font-bold text-white">DockyCount</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-white">Time: {formatTime(usageTime)} / 1h</div>

            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-8 h-8 rounded-full" />
                <span className="text-sm text-white hidden md:block">{user.displayName}</span>
                <Button onClick={handleSignOut} className="bg-red-600 hover:bg-red-700 text-white" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleSignIn} className="bg-blue-600 hover:bg-blue-700 text-white">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            <Card className="bg-[#161616] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Favorites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {favorites.length === 0 ? (
                  <p className="text-sm text-gray-400">No favorites</p>
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
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <img src={fav.avatar || "/placeholder.svg"} alt={fav.name} className="w-8 h-8 rounded-full" />
                      <span className="text-sm text-white truncate">{fav.name}</span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Removed the old compare button from here */}
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            <Card className="bg-[#161616] border-gray-800">
              <CardContent className="pt-6">
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => setCompareMode(false)}
                    className={`flex-1 ${
                      !compareMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                    }`}
                  >
                    Simple Mode
                  </Button>
                  <Button
                    onClick={() => setCompareMode(true)}
                    className={`flex-1 ${
                      compareMode
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                    }`}
                  >
                    Compare Mode
                  </Button>
                </div>

                {!compareMode ? (
                  // Simple Mode: One search bar
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a YouTube channel..."
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                    />
                  </div>
                ) : (
                  // Compare Mode: Two search bars
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for first channel..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        value={searchQuery2}
                        onChange={(e) => setSearchQuery2(e.target.value)}
                        placeholder="Search for second channel..."
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectChannel(result, false)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                      >
                        <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <div className="font-medium text-white">{result[0]}</div>
                          <div className="text-xs text-gray-400">{result[1]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {compareMode && searchResults2.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {searchResults2.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectChannel(result, true)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                      >
                        <img src={result[3] || "/placeholder.svg"} alt={result[0]} className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <div className="font-medium text-white">{result[0]}</div>
                          <div className="text-xs text-gray-400">{result[1]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel Stats */}
            <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>
              {/* Main Channel */}
              {selectedChannel && (
                <Card className="bg-[#161616] border-red-500/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedChannel.avatar || "/placeholder.svg"}
                          alt={selectedChannel.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <CardTitle className="text-xl text-white">{selectedChannel.name}</CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleFavorite(selectedChannel)}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-gray-800"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              favorites.some((f) => f.id === selectedChannel.id)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-white"
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
                          className="hover:bg-gray-800"
                        >
                          <X className="w-5 h-5 text-white" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-white mb-2">
                        <Users className="w-4 h-4" />
                        <span>Subscribers</span>
                      </div>
                      <div
                        id="main-subscribers"
                        className="text-4xl font-[family-name:var(--font-roboto-black)] text-red-400"
                      >
                        0
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-white mb-2">
                          <Eye className="w-4 h-4" />
                          <span>Views</span>
                        </div>
                        <div
                          id="main-views"
                          className="text-2xl font-[family-name:var(--font-roboto-black)] text-blue-400"
                        >
                          0
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-white mb-2">
                          <Video className="w-4 h-4" />
                          <span>Videos</span>
                        </div>
                        <div
                          id="main-videos"
                          className="text-2xl font-[family-name:var(--font-roboto-black)] text-green-400"
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
                <Card className="bg-[#161616] border-blue-500/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={compareChannel.avatar || "/placeholder.svg"}
                          alt={compareChannel.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <CardTitle className="text-xl text-white">{compareChannel.name}</CardTitle>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setCompareChannel(null)
                          if (compareIntervalRef.current) clearInterval(compareIntervalRef.current)
                        }}
                        variant="ghost"
                        size="icon"
                        className="hover:bg-gray-800"
                      >
                        <X className="w-5 h-5 text-white" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-white mb-2">
                        <Users className="w-4 h-4" />
                        <span>Subscribers</span>
                      </div>
                      <div
                        id="compare-subscribers"
                        className="text-4xl font-[family-name:var(--font-roboto-black)] text-red-400"
                      >
                        0
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-white mb-2">
                          <Eye className="w-4 h-4" />
                          <span>Views</span>
                        </div>
                        <div
                          id="compare-views"
                          className="text-2xl font-[family-name:var(--font-roboto-black)] text-blue-400"
                        >
                          0
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-white mb-2">
                          <Video className="w-4 h-4" />
                          <span>Videos</span>
                        </div>
                        <div
                          id="compare-videos"
                          className="text-2xl font-[family-name:var(--font-roboto-black)] text-green-400"
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
              <Card className="bg-[#161616] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-white mb-2">Subscriber Difference</div>
                      <div className="flex items-center gap-2">
                        {selectedChannel.subscribers > compareChannel.subscribers ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-2xl font-bold text-white">
                          {Math.abs(selectedChannel.subscribers - compareChannel.subscribers).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-white mb-2">View Difference</div>
                      <div className="flex items-center gap-2">
                        {selectedChannel.views > compareChannel.views ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-2xl font-bold text-white">
                          {Math.abs(selectedChannel.views - compareChannel.views).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-white mb-2">Video Difference</div>
                      <div className="flex items-center gap-2">
                        {selectedChannel.videos > compareChannel.videos ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-2xl font-bold text-white">
                          {Math.abs(selectedChannel.videos - compareChannel.videos).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
