import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const token = "6dfe7702a2e261bfe04f6bad2";
    try {
        const res = await fetch(`https://api.cuty.io/quick?token=${token}&url=${encodeURIComponent(url)}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        console.error("Shortening error:", e);
        return NextResponse.json({ error: 'Failed to shorten' }, { status: 500 });
    }
}
