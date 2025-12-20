"use client"

import { useState, useEffect, useRef } from "react"
import { initializeApp } from "firebase/app"
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Star, LogOut, TrendingUp, TrendingDown, Users, Eye, Video, X, Server } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AdPlaceholder } from "@/components/AdPlaceholder"
import Script from "next/script"

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
  const [hasSupported, setHasSupported] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [pendingChannel, setPendingChannel] = useState<{ result: any; isCompare: boolean } | null>(null)

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
    if (!hasSupported) {
      setPendingChannel({ result, isCompare })
      setShowSupportModal(true)
      return
    }

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

  const handleSupportClick = () => {
    window.open("https://autographmarquisbuffet.com/hktuecwhup?key=787d3441b545bb69d358126a99434800", "_blank")
    setHasSupported(true)
    setShowSupportModal(false)
    if (pendingChannel) {
      // Small timeout to ensure state updates or just call with the result directly
      const { result, isCompare } = pendingChannel
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
      setSearchResults2([])
      setSearchQuery2("")
      setPendingChannel(null)
    }
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
    <div className="min-h-screen bg-background text-white relative overflow-x-hidden">
      <Toaster />

      {/* Limit Overlay */}
      {showLimitOverlay && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <Card className="max-w-md w-full glass-strong border-red-500/50 shadow-2xl shadow-red-500/20 animate-in fade-in zoom-in duration-300">
            <CardHeader>
              <CardTitle className="text-red-400 text-2xl font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                Usage Limit Reached
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">You have reached the daily usage limit of 1 hour.</p>
              <p className="text-gray-400 text-sm">Come back tomorrow to continue using DockyCount!</p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold btn-glow"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <Card className="max-w-md w-full glass-strong border-purple-500/50 shadow-2xl shadow-purple-500/20 animate-in fade-in zoom-in duration-300">
            <CardHeader>
              <CardTitle className="text-purple-400 text-2xl font-bold flex items-center gap-2">
                <Server className="w-6 h-6" />
                Soutenez l'Hébergement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Pour maintenir le service 24h/24 et 7j/7, nous avons besoin de votre soutien pour financer l'hébergement du serveur.
              </p>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2">
                <p className="text-gray-400 text-sm">
                  <span className="text-purple-400 font-semibold">Conseil :</span> Nous vous conseillons d'utiliser un <span className="text-white">AdBlock</span> pour une meilleure expérience.
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="text-purple-400 font-semibold">Note :</span> Veuillez attendre que la page soit <span className="text-white">entièrement chargée</span> avant de la fermer pour que votre soutien soit comptabilisé.
                </p>
              </div>
              <p className="text-gray-400 text-xs text-center italic">
                Les statistiques s'afficheront immédiatement après avoir cliqué.
              </p>
              <div className="pt-2">
                <Button
                  onClick={handleSupportClick}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-500/30 btn-glow transition-all active:scale-95"
                >
                  Soutenir et Voir Stats
                </Button>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="w-full mt-4 text-gray-500 hover:text-gray-400 text-xs transition-colors"
                >
                  Annuler la recherche
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modern Header with Gradient */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 glass-strong shadow-lg shadow-purple-500/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/30 animate-in zoom-in duration-500">
                DC
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">DockyCount</h1>
                <p className="text-xs text-gray-400">Real-Time YouTube Stats</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg glass">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Time: {formatTime(usageTime)} / 1h</span>
              </div>

              {user ? (
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || ""}
                    alt={user.displayName || ""}
                    className="w-9 h-9 rounded-full border-2 border-purple-500/50 shadow-lg"
                  />
                  <span className="text-sm text-white hidden md:block font-medium">{user.displayName}</span>
                  <Button
                    onClick={handleSignOut}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white btn-glow"
                    size="sm"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleSignIn}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold btn-glow"
                >
                  Sign In with Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Modern Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Favorites Card */}
            <Card className="glass-strong border-purple-500/30 shadow-xl shadow-purple-500/10 card-hover">
              <CardHeader>
                <CardTitle className="text-lg gradient-text-pink flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  Favorites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-gray-400">No favorites yet</p>
                    <p className="text-xs text-gray-500 mt-1">Sign in to save channels</p>
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
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg glass hover:glass-strong transition-all duration-300 text-left group hover:scale-105"
                    >
                      <img
                        src={fav.avatar || "/placeholder.svg"}
                        alt={fav.name}
                        className="w-10 h-10 rounded-full border-2 border-purple-500/30 group-hover:border-purple-500/60 transition-all"
                      />
                      <span className="text-sm text-white truncate font-medium">{fav.name}</span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* AdSense Placeholder - Sidebar (300x250 Medium Rectangle) */}
            <AdPlaceholder className="w-full" width={300} height={250} />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-8">
            {/* Search Card */}
            <Card className="glass-strong border-purple-500/30 shadow-xl shadow-purple-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="pt-6">
                {/* Mode Toggle */}
                <div className="flex gap-3 mb-6">
                  <Button
                    onClick={() => setCompareMode(false)}
                    className={`flex-1 font-semibold transition-all duration-300 ${!compareMode
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/30 btn-glow"
                      : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700"
                      }`}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Simple Mode
                  </Button>
                  <Button
                    onClick={() => setCompareMode(true)}
                    className={`flex-1 font-semibold transition-all duration-300 ${compareMode
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30 btn-glow"
                      : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700"
                      }`}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Compare Mode
                  </Button>
                </div>

                {!compareMode ? (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
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
                  <div className="mt-4 grid gap-4 relative z-50">
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

            <AdPlaceholder className="w-full" width={728} height={90} />

            {/* Channel Stats - Premium Design */}
            <div className={`grid ${compareMode && compareChannel ? "md:grid-cols-2" : "grid-cols-1"} gap-6`}>
              {/* Main Channel Card */}
              {selectedChannel && (
                <Card className="glass-strong border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden relative group card-hover animate-in fade-in slide-in-from-left-4 duration-500">
                  {/* Top gradient accent */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                          <img
                            src={selectedChannel.avatar || "/placeholder.svg"}
                            alt={selectedChannel.name}
                            className="relative w-16 h-16 rounded-full border-4 border-purple-500/30 shadow-xl"
                          />
                          {/* Live Badge */}
                          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/50 animate-pulse">
                            LIVE
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            {selectedChannel.name}
                          </CardTitle>
                          <p className="text-xs text-gray-400 mt-1">Updating every 2 seconds</p>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleFavorite(selectedChannel)}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-purple-500/20 transition-all duration-300 hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 transition-all duration-300 ${favorites.some((f) => f.id === selectedChannel.id)
                              ? "fill-yellow-400 text-yellow-400 drop-shadow-lg drop-shadow-yellow-400/50"
                              : "text-gray-400 hover:text-yellow-400"
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
                          className="hover:bg-red-500/20 transition-all duration-300 hover:scale-110"
                        >
                          <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Subscribers - Main Stat */}
                    <div className="relative glass-strong rounded-xl p-5 stat-glow-red overflow-hidden transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-2xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
                          <Users className="w-5 h-5 text-red-400" />
                          <span className="font-semibold">Subscribers</span>
                        </div>
                        <div
                          id="main-subscribers"
                          className="text-5xl font-[family-name:var(--font-roboto-black)] text-red-400 drop-shadow-lg drop-shadow-red-500/50"
                        >
                          0
                        </div>
                      </div>
                    </div>

                    {/* Views & Videos Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Views */}
                      <div className="relative glass-strong rounded-xl p-4 stat-glow-blue overflow-hidden transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                            <Eye className="w-4 h-4 text-blue-400" />
                            <span className="font-medium">Views</span>
                          </div>
                          <div
                            id="main-views"
                            className="text-2xl font-[family-name:var(--font-roboto-black)] text-blue-400 drop-shadow-md drop-shadow-blue-500/50"
                          >
                            0
                          </div>
                        </div>
                      </div>

                      {/* Videos */}
                      <div className="relative glass-strong rounded-xl p-4 stat-glow-green overflow-hidden transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                            <Video className="w-4 h-4 text-green-400" />
                            <span className="font-medium">Videos</span>
                          </div>
                          <div
                            id="main-videos"
                            className="text-2xl font-[family-name:var(--font-roboto-black)] text-green-400 drop-shadow-md drop-shadow-green-500/50"
                          >
                            0
                          </div>
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

            <div className="mt-8">
              <div id="container-7af5a7128095f6499b5e5fead25034bd" className="flex justify-center"></div>
              <Script
                src="https://autographmarquisbuffet.com/7af5a7128095f6499b5e5fead25034bd/invoke.js"
                strategy="afterInteractive"
                data-cfasync="false"
                async={true}
              />
            </div>

            <AdPlaceholder className="w-full" width={728} height={90} />
          </main>
        </div>
      </div>
    </div>
  )
}
