/**
 * Keyword-based categorization system for privacy coins
 * Analyzes descriptions, tags, and metadata to determine privacy technology
 */

import type { PrivacyTechnology } from "../data/privacyMetadata";

interface CategorizationResult {
  technology: PrivacyTechnology;
  specificTechnology?: string;
  confidence: number;
  matchedKeywords: string[];
}

// Keyword mappings for each technology category
// Keywords are case-insensitive and scored by relevance
const TECHNOLOGY_KEYWORDS: Record<PrivacyTechnology, { primary: string[]; secondary: string[] }> = {
  "zk-SNARKs": {
    primary: ["zk-snark", "zksnark", "zksnarks", "zk-snarks", "sapling", "groth16", "zexe", "plonk", "halo2"],
    secondary: ["shielded transaction", "shielded pool", "zero knowledge", "zk proof", "zero-knowledge proof"]
  },
  "RingCT": {
    primary: ["ringct", "ring confidential transaction"],
    secondary: ["cryptonote", "stealth address", "ring signature", "monero"]
  },
  "Ring Signatures": {
    primary: ["ring signature", "ring-signature"],
    secondary: ["cryptonote", "stealth address", "d/v-clsag", "clsag"]
  },
  "Mimblewimble": {
    primary: ["mimblewimble", "mimble wimble"],
    secondary: ["confidential transaction", "cut-through", "mweb"]
  },
  "CoinJoin": {
    primary: ["coinjoin", "coin join", "coinshuffle", "privatesend"],
    secondary: ["mixing", "tumbler", "wasabi", "join market"]
  },
  "Stealth Addresses": {
    primary: ["stealth address", "stealth-address"],
    secondary: ["hidden recipient", "address privacy"]
  },
  "Other": {
    primary: [],
    secondary: []
  },
  "Unknown": {
    primary: [],
    secondary: []
  }
};

// Specific technology patterns for "Other" category
const SPECIFIC_TECH_PATTERNS: Record<string, string[]> = {
  "TEE": ["trusted execution", "tee", "secure enclave", "sgx", "intel sgx", "confidential computing"],
  "Lelantus": ["lelantus"],
  "Mixnet": ["mixnet", "mix network", "mix node"],
  "Sigma Protocols": ["sigma protocol", "ergo mixer"],
  "CryptoNote+DAG": ["dag", "directed acyclic graph", "cryptonote"],
  "Proxy Re-encryption": ["proxy re-encryption", "proxy reencryption"],
  "sMPC": ["secure multi-party", "smpc", "mpc", "multi-party computation"],
  "Tor/I2P": ["tor", "i2p", "onion routing"],
  "Dual-Chain": ["dual blockchain", "dual chain", "private subchain"],
  "SHIELD/Sapling": ["shield", "sapling", "zerocoin"],
  "Trustchain (DAG)": ["trustchain"],
};

/**
 * Calculate confidence score based on keyword matches
 */
function calculateConfidence(
  primaryMatches: number,
  secondaryMatches: number,
  textLength: number
): number {
  // Base confidence from keyword matches
  const baseScore = (primaryMatches * 30) + (secondaryMatches * 10);
  
  // Penalty for very short text (likely insufficient information)
  const lengthPenalty = textLength < 50 ? 20 : 0;
  
  // Cap at 100
  return Math.min(100, Math.max(0, baseScore - lengthPenalty));
}

/**
 * Search for keywords in text (case-insensitive)
 */
function findKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Detect specific technology for "Other" category
 */
function detectSpecificTechnology(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  for (const [techName, keywords] of Object.entries(SPECIFIC_TECH_PATTERNS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      return techName;
    }
  }
  
  return undefined;
}

/**
 * Categorize a coin based on its description, tags, and metadata
 */
export function categorizeCoin(params: {
  description: string;
  tags?: string[];
  name?: string;
  symbol?: string;
}): CategorizationResult {
  const { description, tags = [], name = "", symbol = "" } = params;
  
  // Combine all text sources
  const combinedText = [description, ...tags, name, symbol].join(" ").toLowerCase();
  
  // Track best match
  let bestMatch: CategorizationResult = {
    technology: "Unknown",
    confidence: 0,
    matchedKeywords: []
  };
  
  // Check each technology category
  const technologies: PrivacyTechnology[] = [
    "zk-SNARKs",
    "RingCT",
    "Ring Signatures",
    "Mimblewimble",
    "CoinJoin",
    "Stealth Addresses"
  ];
  
  for (const tech of technologies) {
    const keywords = TECHNOLOGY_KEYWORDS[tech];
    const primaryMatches = findKeywords(combinedText, keywords.primary);
    const secondaryMatches = findKeywords(combinedText, keywords.secondary);
    
    const totalMatches = primaryMatches.length + secondaryMatches.length;
    
    if (totalMatches > 0) {
      const confidence = calculateConfidence(
        primaryMatches.length,
        secondaryMatches.length,
        combinedText.length
      );
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          technology: tech,
          confidence,
          matchedKeywords: [...primaryMatches, ...secondaryMatches]
        };
      }
    }
  }
  
  // If we have a confident match, return it
  if (bestMatch.confidence >= 70) {
    return bestMatch;
  }
  
  // If confidence is low, check for specific technologies (might be "Other")
  const specificTech = detectSpecificTechnology(combinedText);
  if (specificTech) {
    return {
      technology: "Other",
      specificTechnology: specificTech,
      confidence: 65, // Lower confidence for specific tech detection
      matchedKeywords: [specificTech]
    };
  }
  
  // Mark as Unknown if no good match found
  return {
    technology: "Unknown",
    confidence: bestMatch.confidence,
    matchedKeywords: bestMatch.matchedKeywords
  };
}

/**
 * Calculate privacy score based on technology and features
 */
export function calculatePrivacyScore(params: {
  technology: PrivacyTechnology;
  hasDefaultPrivacy?: boolean;
  hasIPObfuscation?: boolean;
}): number {
  const { technology, hasDefaultPrivacy = false, hasIPObfuscation = false } = params;
  
  // Base scores by technology
  const baseScores: Record<PrivacyTechnology, number> = {
    "zk-SNARKs": 85,
    "RingCT": 90,
    "Ring Signatures": 80,
    "Mimblewimble": 85,
    "CoinJoin": 65,
    "Stealth Addresses": 70,
    "Other": 70,
    "Unknown": 50
  };
  
  let score = baseScores[technology];
  
  // Adjustments
  if (hasDefaultPrivacy) score += 5; // Mandatory privacy is better
  if (hasIPObfuscation) score += 5; // IP protection adds value
  
  // Cap between 40 and 95
  return Math.min(95, Math.max(40, score));
}

