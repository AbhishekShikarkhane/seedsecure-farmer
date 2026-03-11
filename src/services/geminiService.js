const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY || "")}`;

// Session-level flag: once Gemini returns 429 we stop hitting the API
// for the rest of this browser session — quota is clearly exhausted.
let _rateLimited = false;

/**
 * Thin fetch wrapper. On 429, sets the session flag and returns null
 * so callers can fall back instantly without any retry delay.
 */
async function geminiPost(body) {
  if (_rateLimited) return null; // skip immediately if we know quota is gone

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    _rateLimited = true;
    console.warn('[Gemini] API quota exhausted (429). Switching to built-in fallback data for this session.');
    return null;
  }

  return res;
}


export async function getCultivationGuideHTML(seedType, batchId) {
  const today = "2026-02-28";
  const prompt = `Act as an expert Agronomist. Provide a cultivation guide for ${seedType} seeds in 2026 (Batch ${batchId || "N/A"}). 
Sowing time is aligned with ${today}.
You MUST return **ONLY** a valid, raw JSON object exactly matching this structure with no markdown, no triple backticks, and no HTML tags:
{
  "cultivationTips": ["Prepare a fine tilth and ensure good soil drainage.", "Follow recommended spacing.", "Monitor for early pest pressure."],
  "climateGuard": "Maintain optimal temperature and humidity based on regional weather.",
  "soilNutrition": "Maintain soil organic matter with compost or green manure.",
  "healthSummary": "Premium batch verification complete. Your ${seedType} seeds are certified."
}`;

  if (!API_KEY) {
    return JSON.stringify({
      cultivationTips: [
        "Prepare a fine tilth and ensure good soil drainage.",
        "Follow recommended spacing and certified inputs.",
        "Monitor for early pest pressure and irrigate judiciously."
      ],
      climateGuard: "Maintain ideal temperature and humidity based on your local zone.",
      soilNutrition: "Maintain soil organic matter with compost or green manure.",
      healthSummary: `Batch analysis for ${seedType}—optimized guidance for 2026.`
    });
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  const res = await geminiPost(body);
  if (!res || !res.ok) {
    console.warn(`[Gemini] Request failed (Quota exceeded or network error) — using fallback data.`);
    return JSON.stringify({
      cultivationTips: [
        "Prepare a fine tilth and ensure good soil drainage.",
        "Follow recommended spacing and certified inputs.",
        "Monitor for early pest pressure and irrigate judiciously."
      ],
      climateGuard: "Maintain ideal temperature and humidity based on your local zone.",
      soilNutrition: "Maintain soil organic matter with compost or green manure.",
      healthSummary: `Batch analysis for ${seedType}—optimized guidance for 2026.`
    });
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ||
    "";

  let cleanJson = text;
  if (cleanJson.includes("```json")) {
    cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();
  } else if (cleanJson.includes("```")) {
    cleanJson = cleanJson.replace(/```/g, "").trim();
  }

  return cleanJson;
}

export async function getDigitalMemoJSON(seedType, purityScore) {
  const prompt = `You are an expert agronomist. I will provide a seed name and purity score. You must return a JSON object with the following keys: idealWeather (short string), plantingSeason (short string), soilType (short string), and careInstructions (an array of 3 short actionable tips). Do not return markdown, only valid JSON. 
Seed: ${seedType}
Purity: ${purityScore}%`;

  const fallbackData = {
    idealWeather: "Warm & Sunny",
    plantingSeason: "Spring 2026",
    soilType: "Well-drained loam",
    careInstructions: [
      "Ensure consistent watering during germination.",
      "Monitor soil pH levels weekly.",
      "Protect from late season frosts."
    ]
  };

  if (!API_KEY) return fallbackData;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
  };

  try {
    const res = await geminiPost(body);
    if (!res) return fallbackData; // quota exhausted — use fallback instantly

    if (!res.ok) {
      console.warn(`[Gemini] Request failed (${res.status}) — using fallback data.`);
      return fallbackData;
    }

    const data = await res.json();
    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ||
      "";

    if (text.includes("```json")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (text.includes("```")) {
      text = text.replace(/```/g, "").trim();
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Memo Generation Failed:", error);
    return fallbackData;
  }
}

