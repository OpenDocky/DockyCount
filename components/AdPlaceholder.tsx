"use client"

import { useEffect, useRef, useId } from "react"

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
    const uniqueId = useId()

    useEffect(() => {
        if (adLoadedRef.current || !adContainerRef.current) return
        adLoadedRef.current = true

        // Create a unique container for this ad instance
        const adWrapper = document.createElement("div")
        adWrapper.id = `ad-wrapper-${uniqueId.replace(/:/g, '-')}`
        adWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            overflow: hidden;
        `

        // Set atOptions on window with unique key for this instance
        const optionsScript = document.createElement("script")
        optionsScript.type = "text/javascript"
        optionsScript.textContent = `
            atOptions = {
                'key': '${adKey}',
                'format': 'iframe',
                'height': ${height},
                'width': ${width},
                'params': {}
            };
        `
        adWrapper.appendChild(optionsScript)

        // Create and append the ad script
        const invokeScript = document.createElement("script")
        invokeScript.type = "text/javascript"
        invokeScript.src = `https://autographmarquisbuffet.com/${adKey}/invoke.js`
        invokeScript.async = true
        adWrapper.appendChild(invokeScript)

        adContainerRef.current.appendChild(adWrapper)
    }, [adKey, width, height, uniqueId])

    return (
        <div
            ref={adContainerRef}
            className={`relative bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 border border-purple-500/20 rounded-xl backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-purple-500/40 ${className}`}
            style={{
                minHeight: height + 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-tr-3xl pointer-events-none z-10"></div>
        </div>
    )
}
