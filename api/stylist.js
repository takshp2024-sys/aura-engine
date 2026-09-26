const MODEL = "gemini-2.5-flash";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
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
    const { wardrobe = [], weather = null, occasion = "casual" } = req.body || {};

    if (!Array.isArray(wardrobe) || wardrobe.length > 100) {
      return json(res, 400, { error: "Invalid wardrobe data." });
    }

    const prompt = `You are Aura Engine, a practical personal stylist.
Create one outfit from the supplied wardrobe items.
Do not invent clothing items. Reference items by their exact id.
Occasion: ${String(occasion).slice(0, 100)}
Weather: ${JSON.stringify(weather).slice(0, 2000)}
Wardrobe: ${JSON.stringify(wardrobe).slice(0, 20000)}
Return a concise outfit recommendation with selected item ids, explanation, and optional styling tips.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return json(res, 502, {
        error: data?.error?.message || `Gemini request failed with HTTP ${response.status}.`
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    return json(res, 200, { text: text || "No outfit recommendation was returned." });
  } catch (error) {
    console.error("AI stylist error:", error);
    return json(res, 500, { error: "Unable to generate an outfit right now." });
  }
}
