import { blobToBase64 } from './imageUtils';

interface PlantNetResult {
  bestMatch: string; // Scientific name
  commonNames: string[];
  score: number;
}

// ---------------------------------------------------------
// [OPTIONAL] HARDCODE KEY HERE
// ---------------------------------------------------------
const HARDCODED_PLANTNET_KEY = '2b101cyaFGpvoYWldgbpnZhvu';

export const identifyWithPlantNet = async (imageBlob: Blob): Promise<PlantNetResult | null> => {
  try {
    const base64Image = await blobToBase64(imageBlob);
    
    // STRICTLY use the hardcoded key to avoid issues with old keys in localStorage
    const apiKey = HARDCODED_PLANTNET_KEY;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
        headers['x-plantnet-api-key'] = apiKey;
    }

    const response = await fetch('/api/plantnet', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || `PlantNet API Error: ${response.status}`);
    }

    if (!data.results || data.results.length === 0) {
        return null;
    }

    const bestResult = data.results[0];
    const scientificName = bestResult.species.scientificNameWithoutAuthor;
    const commonNames = bestResult.species.commonNames || [];
    const score = bestResult.score;

    return {
        bestMatch: scientificName,
        commonNames: commonNames,
        score: score
    };

  } catch (error) {
    throw error;
  }
};