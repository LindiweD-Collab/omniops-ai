'use server'

import { HfInference } from "@huggingface/inference";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export async function generateAIContent(prompt: string, context: string) {

  if (!HF_API_KEY) {
    console.error(" Error: HUGGINGFACE_API_KEY is missing from .env.local");
    return "Error: API Key is missing. (Using Mock Data for Demo)";
  }

  const hf = new HfInference(HF_API_KEY);

  const fullPrompt = `You are an expert project manager.
Context: ${context}
Task: ${prompt}
Output: Provide a strictly numbered list of 3-5 high-impact execution steps. Be concise.`;

  try {
    console.log(`🤖 Sending request to AI for: "${prompt}"...`);

    const result = await hf.textGeneration({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct", 
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.6,
        return_full_text: false,
      }
    });

    console.log(" AI Response received!");
    return result.generated_text || "No response generated.";

  } catch (error: any) {
    console.error(" AI API Failed:", error.message);
    console.log(" Switching to SAFE DEMO MODE (Fallback)");

    if (context.includes("sales lead")) {
        return `1. Research the lead's LinkedIn and company news.\n2. Identify key decision-makers (CEO, CTO).\n3. Draft a personalized outreach email highlighting ROI.\n4. Schedule a 15-minute discovery call.\n5. Prepare a customized pitch deck.`;
    } else {
        return `1. Define the core requirements for "${prompt}".\n2. Assign resources and set a timeline.\n3. Create a prototype or draft for review.\n4. Conduct internal testing and QA.\n5. Finalize and launch the initiative.`;
    }
  }
}