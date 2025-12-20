"use client"

import { useEffect, useRef } from "react"

interface AdPlaceholderProps {
    className?: string
    adKey?: string
    width?: number
    height?: number
}

export function AdPlaceholder({
    className = "",
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
        const uniqueId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

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
            className={className}
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: width + 40,
                minHeight: height + 20,
                margin: '0 auto',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(8px)',
                padding: '10px',
            }}
        >
            {/* Ad container */}
            <div
                ref={adContainerRef}
                style={{
                    width: width,
                    maxWidth: '100%',
                    height: height,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            />

            {/* Corner accent - top right */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), transparent)',
                    borderBottomLeftRadius: '24px',
                    pointerEvents: 'none',
                }}
            />

            {/* Corner accent - bottom left */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(315deg, rgba(59, 130, 246, 0.15), transparent)',
                    borderTopRightRadius: '24px',
                    pointerEvents: 'none',
                }}
            />
        </div>
    )
}
