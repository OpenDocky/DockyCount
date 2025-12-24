import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const token = "6dfe7702a2e261bfe04f6bad2";

    // Try the exact endpoint: https://cuty.io/quick?token=TOKEN&url=URL
    const endpoint = `https://cuty.io/quick?token=${token}&url=${encodeURIComponent(url)}`;

    try {
        console.log(`[Proxy] Attempting shorten: ${endpoint}`);
        const res = await fetch(endpoint, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const text = await res.text();
        console.log(`[Proxy] Raw Response: ${text}`);

        // Check if the response is actually JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error(`[Proxy] JSON Parse Error: ${parseError}`);
            return NextResponse.json({ error: 'Cuty.io returned non-JSON response', raw: text }, { status: 502 });
        }

        if (data.url) {
            console.log(`[Proxy] Success: ${data.url}`);
            return NextResponse.json(data);
        } else {
            console.warn(`[Proxy] No URL in response:`, data);
            return NextResponse.json({ error: 'Cuty.io response missing URL', data }, { status: 502 });
        }
    } catch (e) {
        console.error(`[Proxy] Fetch Error:`, e);
        return NextResponse.json({ error: 'Failed to contact Cuty.io server' }, { status: 500 });
    }
}
