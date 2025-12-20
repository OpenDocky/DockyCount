"use client"

import { useEffect, useRef } from "react"

export function AdPlaceholder({ className }: { className?: string }) {
    const adContainerRef = useRef<HTMLDivElement>(null)
    const adLoadedRef = useRef(false)

    useEffect(() => {
        if (adLoadedRef.current || !adContainerRef.current) return
        adLoadedRef.current = true

        // Set atOptions on window
        ;(window as any).atOptions = {
            'key': 'ff5f7f27ac4b6d00694ac774e77792f7',
            'format': 'iframe',
            'height': 90,
            'width': 728,
            'params': {}
        }

        // Create and append the ad script
        const script = document.createElement("script")
        script.type = "text/javascript"
        script.src = "https://autographmarquisbuffet.com/ff5f7f27ac4b6d00694ac774e77792f7/invoke.js"
        script.async = true
        adContainerRef.current.appendChild(script)
    }, [])

    return (
        <div
            ref={adContainerRef}
            className={`relative bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 border border-purple-500/20 rounded-xl backdrop-blur-sm flex items-center justify-center min-h-[100px] overflow-hidden transition-all duration-300 hover:border-purple-500/40 ${className}`}
        >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-3xl pointer-events-none"></div>
        </div>
    )
}
