export async function autoTagWardrobeImage(file) {
  if (!file) throw new Error("Choose a clothing photo first.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

  const compressed = await compressForAi(file);
  const image = await blobToBase64(compressed);

  const response = await fetch("/api/tag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image,
      mimeType: "image/jpeg"
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(`AI service returned HTTP ${response.status}.`);
  }

  if (!response.ok) {
    throw new Error(data.error || `AI service returned HTTP ${response.status}.`);
  }

  if (!data.item) throw new Error("AI did not return clothing details.");
  return data.item;
}

async function compressForAi(file) {
  const bitmap = await createImageBitmap(file);
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8)
  );

  if (!blob) throw new Error("Could not prepare the image for AI analysis.");
  return blob;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}
