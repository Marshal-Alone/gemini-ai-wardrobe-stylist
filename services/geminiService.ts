import { GoogleGenAI, Type } from "@google/genai";
import { UserStats, StylistFeedback } from '../types';

// Initialize the Gemini Client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts the Base64 string from a Data URL (removes the "data:image/png;base64," prefix)
 */
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

/**
 * Analyzes the user's body image to estimate physical stats.
 */
export const detectUserStats = async (imageBase64: string): Promise<Partial<UserStats>> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  const prompt = `
    Analyze this image of a person for fashion sizing purposes.
    Estimate the following attributes based on visual cues:
    
    1. Height (e.g., 5'9", 175cm) - Make a best guess based on proportions.
    2. Weight (e.g., 160lbs, 75kg) - Estimate based on build.
    3. Skin Tone (e.g., Fair, Olive, Deep, Tan) - Use descriptive terms suitable for color analysis.
    4. Body Type (e.g., Athletic, Slim, Curvy, Rectangular, Inverted Triangle) - Identify the body shape.

    Return ONLY a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: extractBase64(imageBase64) } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            height: { type: Type.STRING },
            weight: { type: Type.STRING },
            skinTone: { type: Type.STRING },
            bodyType: { type: Type.STRING },
          },
          required: ["height", "weight", "skinTone", "bodyType"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned.");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Generates a virtual try-on image using Gemini Image Model.
 * Uses gemini-2.5-flash-image for efficient image editing/generation.
 * Uses Interleaved Prompting (Text + Image chunks) for precise item mapping.
 */
export const generateTryOnImage = async (
  bodyImages: string[],
  shirtImages: string[],
  pantImages: string[],
  accessoryImages: string[] = [],
  is3DScan: boolean = false
): Promise<string> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash-image';

  // We build the "parts" array dynamically to interleave text descriptions with images.
  // This helps the model understand exactly which image corresponds to what item.
  const parts: any[] = [];

  // 1. Task Definition
  let taskDescription = `
    Generate a high-fashion, photorealistic lookbook image.
    
    TASK:
    Composite the provided clothing and accessories onto the User.
    
    CRITICAL INSTRUCTIONS:
    - PRESERVE USER IDENTITY: Keep the face, body shape, skin tone, and pose exactly as shown in the 'USER BODY' images.
    - PRESERVE CLOTHING DETAILS: The texture, cut, logo, and fabric of the 'SHIRT' and 'PANTS' must be exact.
    - STYLING: Fit the clothing naturally to the user's specific body morphology.
    - ACCESSORIES: If accessories are provided, wear them naturally (e.g. headphones on ears or around neck, glasses on face, bags in hand).
    - LIGHTING: Studio lighting, clean neutral background.
  `;

  if (is3DScan) {
    taskDescription += `
    
    *** 3D SCAN MODE ACTIVATED ***
    - RENDER STYLE: Generate the image to look like a high-fidelity 3D Fashion Simulation (similar to CLO3D or Marvelous Designer renders).
    - EMPHASIS: Focus strictly on VOLUMETRIC FIT, FABRIC PHYSICS, and DRAPING. 
    - VISUALS: Enhance shadows and occlusion to show exactly how the garment sits on the 3D form of the user.
    - OUTPUT: The user should look like a hyper-realistic 3D scanned avatar.
    `;
  }

  parts.push({ text: taskDescription });

  // 2. User Body
  parts.push({ text: "REFERENCE 1: USER BODY & SKIN TONE" });
  bodyImages.forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 3. Shirt
  parts.push({ text: "REFERENCE 2: TOP / SHIRT (Apply to upper body)" });
  shirtImages.forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 4. Pants
  parts.push({ text: "REFERENCE 3: BOTTOMS / PANTS (Apply to lower body)" });
  pantImages.forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 5. Accessories (Optional)
  if (accessoryImages.length > 0) {
    parts.push({ text: "REFERENCE 4: ACCESSORIES (Wear these naturally)" });
    accessoryImages.forEach(img => {
      parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
    });

    // Extract the generated image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

/**
 * Generates expert stylist feedback using Gemini Pro or Flash text model.
 * Updated with a more sophisticated "Fashion Critic" persona.
 */
export const generateStylistFeedback = async (
  generatedTryOnImageBase64: string,
  stats: UserStats
): Promise<StylistFeedback> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  let prompt = `
    ROLE: You are an elite Fashion Editor and Personal Stylist (think Vogue/GQ).
    
    TASK: Analyze the provided image of a user wearing a specific outfit.
    USER CONTEXT: Height: ${stats.height}, Weight: ${stats.weight}, Skin Tone: ${stats.skinTone}, Body Type: ${stats.bodyType}.
    TARGET OCCASION: ${stats.occasion || "General/Versatile"}.
  `;

  if (stats.is3DScan) {
    prompt += `
    MODE: 3D VOLUMETRIC SCAN ANALYSIS.
    The user has requested a technical fit analysis based on 3D scanning principles.
    - Pay special attention to how the fabric drapes over the specific topography of the user's body type.
    - Critique the fit in terms of tightness, looseness, and silhouette balance in a 3D space.
    `;
  }

  prompt += `
    Provide a sophisticated critique in JSON format:

    1. rating: (Number 1-10). Be strict but fair.
    2. suitability: Analyze how the silhouette works with their reported body type AND the target occasion.
    3. colorAnalysis: Perform a Seasonal Color Analysis. Does the outfit harmony complement their skin tone?
    4. verdict: A definitive, punchy fashion statement.
    5. bestForEvent: Evaluate if it fits the '${stats.occasion}' or suggest a better specific context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: extractBase64(generatedTryOnImageBase64) } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.NUMBER },
            suitability: { type: Type.STRING },
            colorAnalysis: { type: Type.STRING },
            verdict: { type: Type.STRING },
            bestForEvent: { type: Type.STRING },
          },
          required: ["rating", "suitability", "colorAnalysis", "verdict", "bestForEvent"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text response from stylist.");
    
    return JSON.parse(text) as StylistFeedback;

  } catch (error) {
    console.error("Gemini Stylist Error:", error);
    return {
      rating: 5,
      suitability: "Could not analyze.",
      colorAnalysis: "N/A",
      verdict: "Error retrieving stylist opinion.",
      bestForEvent: "Unknown"
    };
  }
};