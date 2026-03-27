import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;

    if (!hfToken) {
      return NextResponse.json({ error: "Hugging Face Token not configured on server." }, { status: 500 });
    }

    const modelId = "stabilityai/stable-diffusion-xl-base-1.0";
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

    const imageBlob = await response.blob();
    return new Response(imageBlob, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
