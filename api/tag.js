const MODEL_FALLBACKS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

const schema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    color: { type: "STRING" },
    category: {
      type: "STRING",
      enum: ["jackets", "tops", "bottoms", "shoes", "accessories"]
    },
    subcategory: { type: "STRING" },
    material: { type: "STRING" },
    pattern: { type: "STRING" },
    style: { type: "STRING" },
    season: { type: "STRING" },
    confidence: { type: "NUMBER" }
  },
  required: [
    "name",
    "color",
    "category",
    "subcategory",
    "material",
    "pattern",
    "style",
    "season",
    "confidence"
  ]
};

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return json(res, 500, {
      error: "AI is not configured. Add GEMINI_API_KEY to the server environment."
    });
  }

  try {
    const { image, mimeType = "image/jpeg" } = req.body || {};

    if (typeof image !== "string" || image.length < 100) {
      return json(res, 400, { error: "A base64 image is required." });
    }

    if (image.length > 8_000_000) {
      return json(res, 413, { error: "Image payload is too large. Please use a smaller photo." });
    }

    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
      return json(res, 400, { error: "Only JPEG, PNG, and WebP images are supported." });
    }

    const prompt = `Analyze this clothing photo for a wardrobe app.
Identify the single main clothing/accessory item. Return only the requested structured JSON.
Use one of these exact categories: jackets, tops, bottoms, shoes, accessories.
Keep the name concise and useful, such as "Black denim jacket" or "White sneakers".
Use "Unknown" when material, pattern, or another detail cannot be determined confidently.
Confidence must be a number from 0 to 1.`;

    let lastError = null;

    for (const model of MODEL_FALLBACKS) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: image } }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.2
            }
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = extractText(data);
        if (!text) {
          lastError = new Error("Gemini returned an empty response.");
          continue;
        }

        try {
          const parsed = JSON.parse(text);
          return json(res, 200, { item: parsed });
        } catch {
          lastError = new Error("Gemini returned invalid JSON.");
          continue;
        }
      }

      lastError = new Error(
        data?.error?.message || `Gemini request failed with HTTP ${response.status}.`
      );

      if (![400, 404, 429, 500, 502, 503].includes(response.status)) break;
    }

    console.error("AI tag error:", lastError);
    return json(res, 502, {
      error: lastError?.message || "AI tagging failed. Please try again."
    });
  } catch (error) {
    console.error("AI tag error:", error);
    return json(res, 500, { error: "Unable to analyze the image right now." });
  }
}
