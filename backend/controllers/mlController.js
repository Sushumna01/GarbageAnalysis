const WASTE_GUIDANCE = {
  battery: {
    label: "Battery",
    organization: "Battery and e-waste collection point",
    options: [
      "Do not place batteries in household recycling or general waste.",
      "Take batteries to a designated battery collection point or e-waste facility."
    ]
  },
  cardboard: {
    label: "Cardboard",
    organization: "Cardboard recycling drop-off",
    options: [
      "Flatten cardboard boxes and place them in the cardboard recycling stream.",
      "Check local municipal cardboard collection days or packaging recycling hubs."
    ]
  },
  clothes: {
    label: "Clothing",
    organization: "Textile reuse or donation center",
    options: [
      "Donate wearable clothing to a local reuse or charity collection.",
      "Take worn-out textiles to a textile recycling point where available."
    ]
  },
  glass: {
    label: "Glass",
    organization: "Glass recycling center",
    options: [
      "Empty and rinse glass containers before recycling.",
      "Use a local bottle bank or neighborhood glass drop-off point."
    ]
  },
  metal: {
    label: "Metal",
    organization: "Scrap metal recycler",
    options: [
      "Separate metal items from other mixed waste before collection.",
      "Take aluminum or steel cans to a scrap metal facility or e-waste drop-off."
    ]
  },
  organic: {
    label: "Organic waste",
    organization: "Composting program",
    options: [
      "Compost food scraps and garden waste in a composting bin.",
      "Use a local community compost or municipal green waste collection."
    ]
  },
  paper: {
    label: "Paper",
    organization: "Paper recycling center",
    options: [
      "Keep paper dry and avoid mixing it with food-contaminated waste.",
      "Drop off clean paper and office recycling at a local paper recovery point."
    ]
  },
  plastic: {
    label: "Plastic",
    organization: "Plastic recycling depot",
    options: [
      "Rinse and sort recyclable plastics by resin type when possible.",
      "Use a local recycling depot that accepts plastic bottles and packaging."
    ]
  },
  shoes: {
    label: "Shoes",
    organization: "Footwear reuse or recycling program",
    options: [
      "Donate usable shoes through a local reuse or charity program.",
      "Use a footwear take-back or textile recycling collection for worn-out pairs."
    ]
  },
  trash: {
    label: "Residual waste",
    organization: "Local municipal waste service",
    options: [
      "Check local municipal guidance for non-recyclable or contaminated waste.",
      "Keep hazardous items such as batteries out of the general waste bin."
    ]
  }
};

const normalizeCategory = (value) => String(value || "").trim().toLowerCase();

const getConfidence = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const confidence = Number(value);
  return Number.isFinite(confidence)
    ? Math.min(1, Math.max(0, confidence))
    : null;
};

const formatPrediction = (category, confidence) => ({
  category: normalizeCategory(category),
  confidence: getConfidence(confidence),
});

const getPredictions = (result) => {
  if (!Array.isArray(result.predictions)) {
    return [];
  }

  return result.predictions
    .map((item) => formatPrediction(
      item?.category ?? item?.class ?? item?.name,
      item?.confidence ?? item?.score
    ))
    .filter((item) => item.category && item.confidence !== null)
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 3);
};

const getWasteGuidance = (category) => {
  const key = normalizeCategory(category);
  return WASTE_GUIDANCE[key] || {
    label: "Mixed waste",
    organization: "Local municipal waste service",
    options: [
      "Check your local guidance for mixed or contaminated waste disposal.",
      "Use the nearest regulated waste or recycling center for safe disposal."
    ]
  };
};

const classifyImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload an image file." });
  }

  const mlServiceUrl = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

  try {
    const formData = new FormData();
    const mimeType = req.file.mimetype || "image/jpeg";
    const fileName = req.file.originalname || "upload.jpg";
    const blob = new Blob([req.file.buffer], { type: mimeType });

    formData.append("file", blob, fileName);

    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof result?.detail === "string"
        ? result.detail
        : "The ML service rejected the request.";
      return res.status(response.status || 502).json({ message: detail });
    }

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return res.status(502).json({ message: "The ML service returned an invalid prediction response." });
    }

    const predictions = getPredictions(result);
    const category = normalizeCategory(
      result.category ?? result.class ?? predictions[0]?.category ?? ""
    );

    if (!category) {
      return res.status(502).json({ message: "The ML service did not return a predicted category." });
    }

    const confidence = getConfidence(result.confidence)
      ?? predictions.find((item) => item.category === category)?.confidence
      ?? predictions[0]?.confidence
      ?? 0;

    if (!predictions.some((item) => item.category === category)) {
      predictions.push({ category, confidence });
      predictions.sort((first, second) => second.confidence - first.confidence);
      predictions.splice(3);
    }

    const guidance = getWasteGuidance(category);

    return res.json({
      category,
      class: guidance.label,
      confidence,
      predictions,
      guidance: {
        label: guidance.label,
        organization: guidance.organization,
        options: guidance.options,
      },
      message: `Detected ${guidance.label.toLowerCase()}.`
    });
  } catch (error) {
    console.error("ML classification error:", error);
    const timedOut = error.name === "TimeoutError" || error.name === "AbortError";
    return res.status(502).json({
      message: timedOut
        ? "The ML service did not respond in time. Please try again."
        : "Unable to reach the ML service. Please make sure the Python classifier is running.",
    });
  }
};

module.exports = { classifyImage };
