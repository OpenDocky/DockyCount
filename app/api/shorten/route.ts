import { NextResponse } from 'next/server';

export const runtime = "edge";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const token = process.env.CUTY_TOKEN || "6dfe7702a2e261bfe04f6bad2";

    // Try the exact endpoint requested by user
    const endpoint = `https://cuty.io/quick?token=${token}&url=${encodeURIComponent(url)}`;

    try {
        const res = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Referer": "https://cuty.io/" // Emulate being on their site
            },
            next: { revalidate: 0 } // Disable caching in Next.js
        });

        const text = await res.text();

        try {
            const data = JSON.parse(text);
            if (data.url) {
                return NextResponse.json(data);
            }
            // If Cuty returns an error message in JSON
            return NextResponse.json({
                error: 'Cuty.io error API',
                detail: data,
                endpoint: endpoint.split('token=')[0] + 'token=HIDDEN' // Don't leak token in logs but show structure
            }, { status: 502 });
        } catch (e) {
            // If Cuty returns something that's not JSON (maybe an error page)
            return NextResponse.json({
                error: 'Cuty.io returned non-JSON response',
                status: res.status,
                statusText: res.statusText,
                response: text.substring(0, 500), // First 500 chars to avoid huge payload
                endpoint: endpoint.split('token=')[0] + 'token=HIDDEN'
            }, { status: 502 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to connect to Cuty.io', detail: error?.message }, { status: 500 });
    }
}
