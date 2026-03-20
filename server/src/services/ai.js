const SYSTEM_PROMPT = `You are a precise nutritional analysis AI. When shown a photo of food or drink, you must:
1. Identify every item visible
2. Estimate portion sizes carefully
3. Calculate macronutrients and calories

Respond ONLY with valid JSON (no markdown, no backticks, no preamble). Use this exact schema:
{
  "items": [
    {
      "name": "Item name",
      "portion": "estimated portion (e.g. 1 cup, 200g, 1 medium)",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "sugar_g": 0
    }
  ],
  "totals": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "fiber_g": 0,
    "sugar_g": 0
  },
  "meal_notes": "Brief note about the meal's nutritional profile, suggestions, etc."
}

Be accurate and conservative with estimates. If unsure about portion size, state your assumption in the item name. Round to 1 decimal place.`;

// --- Anthropic ---
async function analyzeWithAnthropic(base64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Analyze this food/drink and provide the full nutritional breakdown." },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);
  return data.content.find((b) => b.type === "text")?.text || "";
}

// --- Gemini ---
async function analyzeWithGemini(base64, mediaType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        parts: [
          { inlineData: { mimeType: mediaType, data: base64 } },
          { text: "Analyze this food/drink and provide the full nutritional breakdown." },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini error ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// --- OpenAI ---
async function analyzeWithOpenAI(base64, mediaType) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
            { type: "text", text: "Analyze this food/drink and provide the full nutritional breakdown." },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
  return data.choices?.[0]?.message?.content || "";
}

// --- Ollama (local) ---
async function analyzeWithOllama(base64, _mediaType) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2-vision",
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: "Analyze this food/drink and provide the full nutritional breakdown.",
          images: [base64],
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ollama error ${res.status}`);
  return data.message?.content || "";
}

// --- Dispatcher ---
const providers = {
  anthropic: analyzeWithAnthropic,
  gemini: analyzeWithGemini,
  openai: analyzeWithOpenAI,
  ollama: analyzeWithOllama,
};

export async function analyzeFood(base64, mediaType, provider) {
  const providerName = provider || process.env.AI_PROVIDER || "gemini";
  const analyzeFn = providers[providerName];

  if (!analyzeFn) {
    throw new Error(`Unknown provider: ${providerName}. Use: ${Object.keys(providers).join(", ")}`);
  }

  const raw = await analyzeFn(base64, mediaType);
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return { data: JSON.parse(cleaned), provider: providerName };
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Raw: ${cleaned.slice(0, 200)}`);
  }
}
