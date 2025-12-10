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
 * Analyzes the user's body image to estimate physical stats with enhanced accuracy.
 */
export const detectUserStats = async (imageBase64: string): Promise<Partial<UserStats>> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  const prompt = `
    You are an expert fashion consultant specializing in body analysis for personalized styling.
    
    TASK: Analyze this full-body image with precision for fashion fitting purposes.
    
    INSTRUCTIONS:
    1. HEIGHT ESTIMATION:
       - Analyze body proportions (head-to-body ratio, limb length)
       - Consider visual context clues (doorways, furniture if visible)
       - Provide estimate in both imperial and metric (e.g., "5'9\" / 175cm")
    
    2. WEIGHT ESTIMATION:
       - Assess overall build and frame
       - Consider muscle mass vs. body fat distribution
       - Provide range if uncertain (e.g., "155-165lbs / 70-75kg")
    
    3. SKIN TONE CLASSIFICATION:
       - Use professional undertone analysis (warm, cool, neutral)
       - Categories: Porcelain, Fair, Light, Medium, Tan, Olive, Deep, Rich Deep
       - Include undertone (e.g., "Fair with cool undertones")
    
    4. BODY TYPE CLASSIFICATION:
       - Analyze shoulder-to-hip ratio, torso length, limb proportions
       - Categories: Rectangular, Triangle (Pear), Inverted Triangle, Hourglass, Athletic, Oval
       - Include descriptor (e.g., "Athletic with broad shoulders")
    
    5. ADDITIONAL OBSERVATIONS:
       - Note posture if relevant to fitting
       - Identify any asymmetries that might affect clothing fit
    
    IMPORTANT: Base all estimates on visible evidence. Be conservative and realistic.
    
    OUTPUT: Return ONLY valid JSON with the specified structure.
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
            additionalNotes: { type: Type.STRING },
          },
          required: ["height", "weight", "skinTone", "bodyType"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned from Gemini.");

    const parsed = JSON.parse(text);
    console.log("User stats detected successfully:", parsed);
    return parsed;

  } catch (error) {
    console.error("Gemini Body Analysis Error:", error);
    throw new Error(`Failed to analyze body image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generates a photorealistic virtual try-on image using Gemini's advanced image model.
 * Enhanced with sophisticated prompting for maximum fidelity.
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

  const parts: any[] = [];

  // 1. Enhanced Task Definition
  let taskDescription = `
    You are a professional fashion visualization AI specializing in photorealistic virtual try-ons.
    
    OBJECTIVE: Create a hyper-realistic composite image showing the user wearing the specified clothing items.
    
    ═══════════════════════════════════════════════════════════════════
    CRITICAL PRESERVATION REQUIREMENTS (NON-NEGOTIABLE):
    ═══════════════════════════════════════════════════════════════════
    
    ✓ USER IDENTITY PRESERVATION:
      - Maintain EXACT facial features, expressions, and skin texture
      - Preserve natural skin tone, blemishes, and skin characteristics
      - Keep original hair style, color, and texture
      - Maintain body proportions, muscle definition, and posture
      - Do NOT alter, beautify, or modify the person's appearance
    
    ✓ CLOTHING FIDELITY:
      - Replicate EXACT fabric texture (weave, knit, denim grain, etc.)
      - Preserve all logos, patterns, prints, and embellishments perfectly
      - Maintain accurate colors (no color shifting or saturation changes)
      - Keep original garment cut, seam lines, and construction details
      - Include all visible tags, buttons, zippers, and hardware
    
    ═══════════════════════════════════════════════════════════════════
    TECHNICAL RENDERING REQUIREMENTS:
    ═══════════════════════════════════════════════════════════════════
    
    ✓ PHYSICS & FIT:
      - Drape fabric naturally according to gravity and body contours
      - Show realistic wrinkles, folds, and tension points
      - Ensure garments follow the user's specific body morphology
      - Demonstrate proper garment weight (heavy coat vs. light tee)
      - Show natural fabric behavior at joints (elbows, knees, waist)
    
    ✓ LIGHTING & SHADOWS:
      - Studio lighting setup: soft key light, subtle fill light
      - Cast realistic shadows from garments onto body
      - Show fabric depth through subtle shadowing in folds
      - Maintain consistent light direction across all elements
      - Include ambient occlusion where garments touch body
    
    ✓ INTEGRATION & REALISM:
      - Seamlessly blend clothing edges with body (no hard boundaries)
      - Show skin naturally where appropriate (neck, wrists, ankles)
      - Layer garments correctly (shirt tucked/untucked as appropriate)
      - Ensure proper occlusion (front items block back items)
    
    ✓ ACCESSORIES INTEGRATION:
      ${accessoryImages.length > 0 ? `
      - Place accessories in natural, functional positions
      - Headphones: on ears or around neck with proper weight
      - Glasses: properly seated on nose bridge and ears
      - Bags: held in hand or on shoulder with realistic grip/strap
      - Watches/jewelry: positioned accurately on wrists/body
      ` : '- No accessories in this composition'}
    
    ═══════════════════════════════════════════════════════════════════
    SCENE & COMPOSITION:
    ═══════════════════════════════════════════════════════════════════
    - Background: Clean neutral gray or white seamless backdrop
    - Pose: Maintain user's original stance or natural standing position
    - Framing: Full body visible from head to toe, centered
    - Quality: Magazine-quality lookbook photography standard
  `;

  if (is3DScan) {
    taskDescription += `
    
    ═══════════════════════════════════════════════════════════════════
    ⚡ 3D VOLUMETRIC SCAN MODE ACTIVATED ⚡
    ═══════════════════════════════════════════════════════════════════
    
    RENDERING STYLE:
    - Generate output as a HIGH-FIDELITY 3D FASHION SIMULATION
    - Visual quality comparable to: CLO3D, Marvelous Designer, Browzwear
    - Emphasis on: VOLUMETRIC FIT ANALYSIS and FABRIC PHYSICS
    
    TECHNICAL FOCUS:
    ✓ Fabric Draping Physics:
      - Show precise fabric behavior based on material properties
      - Demonstrate stretch/compression zones on the body
      - Highlight areas of tension vs. looseness
      - Display realistic wrinkle patterns from movement
    
    ✓ 3D Body Topology Mapping:
      - Show exact garment conformation to body curves
      - Emphasize fit tightness/looseness at key measurement points
      - Display clearance space between body and fabric
      - Highlight pressure points and fabric contact areas
    
    ✓ Enhanced Visualization:
      - Stronger shadows for depth perception
      - Enhanced ambient occlusion in garment seams
      - Subsurface scattering on fabric edges
      - Technical mesh-quality surface detail
    
    OUTPUT AESTHETIC:
    - User appears as hyper-realistic 3D scanned avatar
    - Clinical precision in fit representation
    - Professional CAD/fashion tech visualization quality
    `;
  }

  parts.push({ text: taskDescription });

  // 2. User Body Reference
  parts.push({
    text: `
    ═══════════════════════════════════════════════════════════════════
    📋 REFERENCE 1: USER BODY TEMPLATE
    ═══════════════════════════════════════════════════════════════════
    USE THIS IMAGE AS THE BASE TEMPLATE.
    - This is the person who will be wearing the clothing
    - Preserve their EXACT appearance, skin tone, and body shape
    - Maintain their pose and proportions precisely
    - Number of reference images: ${bodyImages.length}
    `
  });
  bodyImages.forEach((img, idx) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 3. Shirt Reference
  parts.push({
    text: `
    ═══════════════════════════════════════════════════════════════════
    👕 REFERENCE 2: UPPER BODY GARMENT (SHIRT/TOP)
    ═══════════════════════════════════════════════════════════════════
    APPLY THIS GARMENT TO THE USER'S UPPER BODY.
    - Map this shirt/top onto the torso, arms, and shoulders
    - Maintain EXACT colors, patterns, logos, and fabric texture
    - Ensure proper fit based on garment style (fitted vs. loose)
    - Show natural draping from shoulders down
    - Number of reference images: ${shirtImages.length}
    `
  });
  shirtImages.forEach((img, idx) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 4. Pants Reference
  parts.push({
    text: `
    ═══════════════════════════════════════════════════════════════════
    👖 REFERENCE 3: LOWER BODY GARMENT (PANTS/BOTTOMS)
    ═══════════════════════════════════════════════════════════════════
    APPLY THIS GARMENT TO THE USER'S LOWER BODY.
    - Map these pants/bottoms onto the hips, legs, and ankles
    - Maintain EXACT colors, patterns, and fabric texture
    - Show proper waist fit and leg drape
    - Include realistic creasing at knees and thighs
    - Number of reference images: ${pantImages.length}
    `
  });
  pantImages.forEach((img, idx) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
  });

  // 5. Accessories (Optional)
  if (accessoryImages.length > 0) {
    parts.push({
      text: `
      ═══════════════════════════════════════════════════════════════════
      ✨ REFERENCE 4: ACCESSORIES & STYLING ELEMENTS
      ═══════════════════════════════════════════════════════════════════
      ADD THESE ACCESSORIES TO THE USER IN NATURAL POSITIONS.
      - Place each accessory functionally and realistically
      - Maintain original colors, materials, and branding
      - Show proper interaction with body/clothing
      - Number of accessory images: ${accessoryImages.length}
      `
    });
    accessoryImages.forEach((img, idx) => {
      parts.push({ inlineData: { mimeType: 'image/png', data: extractBase64(img) } });
    });
  }

  parts.push({
    text: `
    ═══════════════════════════════════════════════════════════════════
    🎯 FINAL INSTRUCTION
    ═══════════════════════════════════════════════════════════════════
    Generate ONE final photorealistic image showing the user wearing all specified items.
    Quality standard: Professional fashion lookbook / e-commerce photography.
    `
  });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
    });

    // Extract the generated image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini image generation.");
    }

    for (const part of candidates[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        console.log("Try-on image generated successfully");
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in Gemini response.");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw new Error(`Failed to generate try-on image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generates sophisticated stylist feedback using expert fashion analysis.
 * Enhanced with comprehensive styling critique and actionable recommendations.
 */
export const generateStylistFeedback = async (
  generatedTryOnImageBase64: string,
  stats: UserStats
): Promise<StylistFeedback> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  let prompt = `
    You are VALENTINA ROSS, a renowned Fashion Director with 20 years of experience at Vogue, GQ, and Harper's Bazaar.
    You have styled A-list celebrities, influencers, and executives. Your eye for detail is legendary, and your critiques are both honest and constructive.
    
    ═══════════════════════════════════════════════════════════════════
    ASSIGNMENT: COMPREHENSIVE OUTFIT ANALYSIS
    ═══════════════════════════════════════════════════════════════════
    
    CLIENT PROFILE:
    • Height: ${stats.height}
    • Weight: ${stats.weight}
    • Skin Tone: ${stats.skinTone}
    • Body Type: ${stats.bodyType}
    • Target Occasion: ${stats.occasion || "Versatile / Multi-purpose"}
    • Style Preferences: ${stats.stylePreferences || "Not specified"}
  `;

  if (stats.is3DScan) {
    prompt += `
    
    ⚡ 3D TECHNICAL FIT ANALYSIS MODE ⚡
    
    This client has requested a VOLUMETRIC FIT ASSESSMENT based on 3D scanning principles.
    
    TECHNICAL EVALUATION CRITERIA:
    1. GARMENT CLEARANCE ANALYSIS:
       - Assess ease (space between body and fabric) at key measurement points
       - Identify compression zones (too tight) vs. excess volume (too loose)
       - Evaluate mobility range in garment
    
    2. FABRIC DRAPE MECHANICS:
       - Analyze how fabric responds to body topology
       - Identify areas of tension, pulling, or bunching
       - Assess whether fabric weight suits body type
    
    3. SILHOUETTE VOLUMETRICS:
       - Evaluate 3D proportions (shoulder-waist-hip balance)
       - Assess visual weight distribution
       - Identify areas that add/reduce visual mass
    
    4. FIT PRECISION RATING:
       - Use technical terminology (pitch, break, rise, drop)
       - Reference industry fit standards (slim fit, regular, relaxed)
       - Suggest specific alterations if needed (take in, let out, shorten)
    `;
  }

  prompt += `
    
    ═══════════════════════════════════════════════════════════════════
    ANALYSIS FRAMEWORK
    ═══════════════════════════════════════════════════════════════════
    
    Analyze the outfit shown in the provided image using the following dimensions:
    
    1️⃣ OVERALL RATING (1-10 scale):
       - Be discerning but fair. A 7+ means genuinely impressive.
       - 8-10: Editorial-worthy, red carpet ready
       - 6-7: Solid, flattering, minor tweaks needed
       - 4-5: Functional but unremarkable, needs work
       - 1-3: Poor fit/color/style choices, major revision needed
    
    2️⃣ FIT & SUITABILITY ANALYSIS:
       - How do the proportions work with the ${stats.bodyType} body type?
       - Does the silhouette enhance or detract from their natural shape?
       - Are there fit issues? (too tight, too loose, wrong length, etc.)
       - How does the outfit serve the "${stats.occasion || "general"}" occasion?
       - What body features does it highlight/minimize effectively?
       - Specific improvements: (e.g., "Hem pants 1 inch", "Size down on shirt")
    
    3️⃣ COLOR HARMONY & SEASONAL ANALYSIS:
       - Perform a Seasonal Color Analysis based on ${stats.skinTone} skin tone
       - Likely season: Spring (warm, bright) / Summer (cool, soft) / Autumn (warm, muted) / Winter (cool, bright)
       - Do the outfit colors complement or clash with their complexion?
       - Which colors are working? Which should be avoided?
       - Suggest alternative colors that would create better harmony
       - Rate color choices: Exceptional / Good / Neutral / Poor
    
    4️⃣ STYLE VERDICT:
       - Give a definitive, memorable fashion statement (1-2 sentences)
       - Channel the directness of Anna Wintour with the creativity of André Leon Talley
       - Be honest but constructive. Elevate or redirect as needed.
       - Examples: "Effortlessly chic—the fit is impeccable." / "Safe but uninspired; needs a bold statement piece."
    
    5️⃣ OCCASION OPTIMIZATION:
       - Is this outfit ideal for "${stats.occasion || "general wear"}"?
       - If not, what occasion would it BEST suit? (be specific: "cocktail party", "business casual Friday", "weekend brunch")
       - What single change would make it perfect for the target occasion?
       - Alternative styling suggestions for the same garments
    
    6️⃣ ACTIONABLE RECOMMENDATIONS:
       - Top 3 specific improvements or alternatives
       - What to add, remove, or change
       - Accessory suggestions to elevate the look
       - Hair/grooming notes if relevant to overall presentation
    
    ═══════════════════════════════════════════════════════════════════
    TONE & STYLE:
    ═══════════════════════════════════════════════════════════════════
    - Be sophisticated and authoritative, not condescending
    - Celebrate what works, be specific about what doesn't
    - Use fashion industry terminology naturally
    - Give confidence-building feedback even when critical
    - Make the client feel they have a personal stylist in their corner
    
    ═══════════════════════════════════════════════════════════════════
    OUTPUT: Return ONLY valid JSON matching the specified schema.
    ═══════════════════════════════════════════════════════════════════
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
            rating: {
              type: Type.NUMBER,
              description: "Overall style rating from 1-10"
            },
            suitability: {
              type: Type.STRING,
              description: "Detailed analysis of fit and how it works with body type"
            },
            colorAnalysis: {
              type: Type.STRING,
              description: "Seasonal color analysis and harmony assessment"
            },
            verdict: {
              type: Type.STRING,
              description: "Punchy, memorable fashion statement"
            },
            bestForEvent: {
              type: Type.STRING,
              description: "Ideal occasion for this outfit"
            },
            improvements: {
              type: Type.STRING,
              description: "Top 3 actionable recommendations"
            },
          },
          required: ["rating", "suitability", "colorAnalysis", "verdict", "bestForEvent"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text response from Gemini stylist analysis.");

    const feedback = JSON.parse(text) as StylistFeedback;
    console.log(`Stylist feedback generated - Rating: ${feedback.rating}/10`);
    return feedback;

  } catch (error) {
    console.error("Gemini Stylist Analysis Error:", error);

    // Return graceful fallback instead of throwing
    return {
      rating: 5,
      suitability: "Unable to complete detailed analysis due to a technical issue. Please try again.",
      colorAnalysis: "Color analysis temporarily unavailable.",
      verdict: "Analysis incomplete - please regenerate for full stylist feedback.",
      bestForEvent: "Unable to determine",
      improvements: "Please regenerate analysis for personalized recommendations."
    };
  }
};