export function AdPlaceholder({ className }: { className?: string }) {
    return (
        <div
            className={`relative bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 border border-purple-500/20 rounded-xl backdrop-blur-sm flex items-center justify-center min-h-[100px] overflow-hidden group transition-all duration-300 hover:border-purple-500/40 ${className}`}
        >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-2 p-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-medium">Advertisement</span>
                    <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-pulse"></div>
                </div>
                <p className="text-[10px] text-gray-600 text-center max-w-xs">
                    This space is reserved for AdSense ads
                </p>
            </div>

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-3xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-3xl"></div>
        </div>
    )
}
