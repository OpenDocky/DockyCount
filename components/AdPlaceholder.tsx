"use client"

import { useEffect, useRef } from "react"

interface AdPlaceholderProps {
    className?: string
    adKey?: string
    width?: number
    height?: number
}

export function AdPlaceholder({
    className,
    adKey = 'ff5f7f27ac4b6d00694ac774e77792f7',
    width = 728,
    height = 90
}: AdPlaceholderProps) {
    const adContainerRef = useRef<HTMLDivElement>(null)
    const adLoadedRef = useRef(false)

    useEffect(() => {
        if (adLoadedRef.current || !adContainerRef.current) return
        adLoadedRef.current = true

        // Create unique ID for this ad instance
        const uniqueId = `ad-${Math.random().toString(36).substring(2, 9)}`

        // Set atOptions on window
        const optionsScript = document.createElement("script")
        optionsScript.type = "text/javascript"
        optionsScript.id = `options-${uniqueId}`
        optionsScript.textContent = `
            atOptions = {
                'key': '${adKey}',
                'format': 'iframe',
                'height': ${height},
                'width': ${width},
                'params': {}
            };
        `
        adContainerRef.current.appendChild(optionsScript)

        // Create and append the ad script
        const invokeScript = document.createElement("script")
        invokeScript.type = "text/javascript"
        invokeScript.id = `invoke-${uniqueId}`
        invokeScript.src = `https://autographmarquisbuffet.com/${adKey}/invoke.js`
        adContainerRef.current.appendChild(invokeScript)
    }, [adKey, width, height])

    return (
        <div
            className={`relative bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 border border-purple-500/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-purple-500/40 ${className}`}
            style={{
                width: '100%',
                maxWidth: width + 40,
                minHeight: height + 20,
                margin: '0 auto',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Ad container */}
            <div
                ref={adContainerRef}
                style={{
                    width: width,
                    height: height,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            />

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-3xl pointer-events-none z-10"></div>
        </div>
    )
}
