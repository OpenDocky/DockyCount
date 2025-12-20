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
        adContainerRef.current.appendChild(optionsScript)

        // Create and append the ad script
        const invokeScript = document.createElement("script")
        invokeScript.type = "text/javascript"
        invokeScript.src = `https://autographmarquisbuffet.com/${adKey}/invoke.js`
        invokeScript.async = true
        adContainerRef.current.appendChild(invokeScript)
    }, [adKey, width, height, uniqueId])

    return (
        <div
            className={`relative rounded-xl ${className}`}
            style={{
                width: '100%',
                maxWidth: width,
                height: height + 20,
                margin: '0 auto',
                overflow: 'hidden',
            }}
        >
            {/* Ad container with strict clipping */}
            <div
                ref={adContainerRef}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: width,
                    height: height,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    clipPath: `inset(0 0 0 0)`,
                }}
            />

            {/* Decorative background */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 border border-purple-500/20 rounded-xl pointer-events-none"
                style={{ zIndex: -1 }}
            />
        </div>
    )
}
