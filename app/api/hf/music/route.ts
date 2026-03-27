import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN; // Using server-side env in production is better, but this will work for now

    if (!hfToken) {
      return NextResponse.json({ error: "Hugging Face Token not configured on server." }, { status: 500 });
    }

    const modelId = "facebook/musicgen-small";
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const detail = await response.json();
      return NextResponse.json({ error: detail.error || "Hugging Face API error" }, { status: response.status });
    }

    const audioBlob = await response.blob();
    return new Response(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
