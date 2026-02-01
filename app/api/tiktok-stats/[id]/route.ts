import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://mixerno.space/api/tiktok-user-counter/user/${id}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) {
            throw new Error(`Upstream API responded with ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy TikTok Stats Error:", error);
        return NextResponse.json({ error: "Failed to fetch TikTok stats" }, { status: 500 });
    }
}
