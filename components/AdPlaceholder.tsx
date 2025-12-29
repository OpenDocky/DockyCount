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
        background: 'rgba(0, 243, 255, 0.05)',
        border: '1px solid rgba(0, 243, 255, 0.2)',
        borderRadius: '0px',
        backdropFilter: 'blur(12px)',
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
            <div className="hud-corner hud-tl" style={{ border: '1px solid rgba(0, 243, 255, 0.5)', borderRight: 'none', borderBottom: 'none' }}></div>
            <div className="hud-corner hud-br" style={{ border: '1px solid rgba(0, 243, 255, 0.5)', borderLeft: 'none', borderTop: 'none' }}></div>

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
        </div>
    )
}
