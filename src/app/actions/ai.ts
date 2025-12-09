'use server'

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export async function generateAIContent(prompt: string, context: string) {
  if (!HF_API_KEY) throw new Error("Missing Hugging Face API Key");


  const fullPrompt = `<s>[INST] You are an expert business automation AI. 
  Context: ${context}
  Task: ${prompt}
  
  Keep the answer professional, concise, and formatted with bullet points if needed. [/INST]`;

  try {
    const response = await fetch(MODEL_URL, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { max_new_tokens: 250, temperature: 0.7 }
      }),
    });

    const result = await response.json();
    
    let text = result[0]?.generated_text || "AI Error";
    
    text = text.replace(fullPrompt, "").trim();
    return text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Failed to generate AI response. Please check API keys.";
  }
}