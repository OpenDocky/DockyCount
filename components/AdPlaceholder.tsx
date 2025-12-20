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
    const containerStyle: React.CSSProperties = {
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
    }

    const adHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; background: transparent; }
                </style>
            </head>
            <body>
                <script type="text/javascript">
                    atOptions = {
                        'key' : '${adKey}',
                        'format' : 'iframe',
                        'height' : ${height},
                        'width' : ${width},
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="https://autographmarquisbuffet.com/${adKey}/invoke.js"></script>
            </body>
        </html>
    `

    return (
        <div className={className} style={containerStyle}>
            {/* Ad container using iframe isolation */}
            <iframe
                title={`ad-${adKey}`}
                srcDoc={adHtml}
                width={width}
                height={height}
                scrolling="no"
                frameBorder="0"
                allowTransparency={true}
                style={{
                    border: 'none',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    display: 'block',
                    background: 'transparent'
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
