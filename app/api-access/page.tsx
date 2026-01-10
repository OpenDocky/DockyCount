"use client"

import { Code2, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export const runtime = "edge";

export default function ApiAccessPage() {
    const [copied, setCopied] = useState(false)

    const copyEndpoint = () => {
        navigator.clipboard.writeText("https://dockycount.com/api/v1/stats/:id")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-20">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter gradient-text">API Access</h1>
                    <p className="text-xl text-muted-foreground font-medium max-w-2xl">
                        Integrate DockyCount's high-frequency statistics directly into your own applications.
                    </p>
                </div>

                <div className="aura-card p-8 space-y-6">
                    <div className="flex items-center gap-4 border-b border-border pb-6">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Code2 className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Public Endpoint</h2>
                            <p className="text-sm text-muted-foreground">Rate limited to 60 req/min</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">GET Request</label>
                        <div className="flex items-center gap-2 bg-secondary p-4 rounded-xl border border-border font-mono text-sm">
                            <span className="text-primary font-bold">GET</span>
                            <span className="flex-1 truncate">/api/stats/[channel_id]</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyEndpoint}
                                className="hover:bg-background"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Response Example</label>
                        <pre className="bg-slate-950 text-slate-50 p-6 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed">
                            {`{
  "id": "UCX6OQ3DkcsbYNE6H8uQQuVA",
  "name": "MrBeast",
  "subscribers": 320000000,
  "views": 64000000000,
  "videos": 820,
  "est_subscribers": 320154820 
}`}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}
