import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { systemInstruction, input } = await req.json();
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN;

    if (!hfToken) {
      return NextResponse.json({ error: "Hugging Face Token not configured on server." }, { status: 500 });
    }

    const modelId = "mistralai/Mistral-7B-Instruct-v0.2";
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ 
          inputs: `<s>[INST] ${systemInstruction} \n\n ${input} [/INST]`,
          parameters: { max_new_tokens: 500 }
        }),
      }
    );

    if (!response.ok) {
       const detail = await response.json();
       return NextResponse.json({ error: detail.error || "Hugging Face API error" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
