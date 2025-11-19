/**
 * Merge parsed database data into privacyMetadata.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { privacyMetadata, type PrivacyLevel, type PrivacyTechnology } from '../data/privacyMetadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParsedCoinData {
  name: string;
  symbol: string;
  coinId: string;
  fullDescription: string;
  privacySolutionSummary: string;
  privacyTechCategory: string;
  securityRating: number;
  privacyLevel: PrivacyLevel;
  privacyLevelExplanation: string;
}

// Map database privacy tech categories to our PrivacyTechnology types
function mapTechnology(dbTech: string): PrivacyTechnology {
  const normalized = dbTech.toLowerCase();
  
  if (normalized.includes('zk-snark') || normalized === 'zk proofs / confidential security protocol') {
    return 'zk-SNARKs';
  }
  if (normalized.includes('ring signature') || normalized.includes('cryptonote') || normalized === 'ringct / confidential transactions') {
    return 'Ring Signatures';
  }
  if (normalized.includes('mimblewimble')) {
    return 'Mimblewimble';
  }
  if (normalized.includes('coinjoin') || normalized.includes('mixing')) {
    return 'CoinJoin';
  }
  if (normalized.includes('tee') || normalized.includes('confidential computing') || normalized.includes('confidential smart contracts')) {
    return 'TEE';
  }
  if (normalized.includes('mixnet') || normalized.includes('network-level privacy')) {
    return 'Mixnet';
  }
  if (normalized.includes('mpc') || normalized.includes('multi-party computation')) {
    return 'MPC';
  }
  
  return 'Other';
}

function mergeData() {
  // Read parsed coins data
  const parsedCoinsPath = path.join(__dirname, '../../parsed-coins-data.json');
  const parsedCoins: ParsedCoinData[] = JSON.parse(fs.readFileSync(parsedCoinsPath, 'utf-8'));
  
  // Create a map of database coins by coinId
  const dbCoinsMap = new Map<string, ParsedCoinData>();
  parsedCoins.forEach(coin => {
    dbCoinsMap.set(coin.coinId, coin);
  });
  
  // Merge database data with existing metadata
  const mergedMetadata: Record<string, any> = {};
  
  // Process existing metadata
  Object.keys(privacyMetadata).forEach(coinId => {
    const existing = privacyMetadata[coinId];
    const dbCoin = dbCoinsMap.get(coinId);
    
    if (dbCoin) {
      // Merge with database data (database values take precedence)
      mergedMetadata[coinId] = {
        ...existing,
        technology: mapTechnology(dbCoin.privacyTechCategory),
        specificTechnology: dbCoin.privacyTechCategory,
        privacyLevel: dbCoin.privacyLevel,
        securityRating: dbCoin.securityRating,
        fullDescription: dbCoin.fullDescription,
        privacySolutionSummary: dbCoin.privacySolutionSummary,
        privacyLevelExplanation: dbCoin.privacyLevelExplanation,
        isEnhanced: true
      };
    } else {
      // Keep existing metadata for coins not in database
      mergedMetadata[coinId] = existing;
    }
  });
  
  // Add new coins from database that don't exist in current metadata
  parsedCoins.forEach(dbCoin => {
    if (!mergedMetadata[dbCoin.coinId]) {
      // Create new metadata entry
      mergedMetadata[dbCoin.coinId] = {
        coinId: dbCoin.coinId,
        technology: mapTechnology(dbCoin.privacyTechCategory),
        specificTechnology: dbCoin.privacyTechCategory,
        privacyLevel: dbCoin.privacyLevel,
        privacyScore: dbCoin.privacyLevel === 'High' ? 85 : dbCoin.privacyLevel === 'Medium' ? 65 : 45,
        features: {
          hiddenAmounts: dbCoin.privacyLevel === 'High',
          hiddenSender: dbCoin.privacyLevel === 'High',
          hiddenRecipient: dbCoin.privacyLevel === 'High',
          defaultPrivacy: dbCoin.privacyLevel === 'High',
          ipObfuscation: false
        },
        technologyDescription: dbCoin.privacySolutionSummary,
        securityRating: dbCoin.securityRating,
        fullDescription: dbCoin.fullDescription,
        privacySolutionSummary: dbCoin.privacySolutionSummary,
        privacyLevelExplanation: dbCoin.privacyLevelExplanation,
        isEnhanced: true
      };
    }
  });
  
  return mergedMetadata;
}

function generateTypeScriptCode(metadata: Record<string, any>): string {
  let code = `/**
 * Privacy Coin Metadata
 * 
 * Curated data about privacy technologies and features for each privacy coin.
 * This metadata enhances the display and helps users understand the privacy
 * characteristics of each cryptocurrency.
 * 
 * Enhanced with comprehensive database information including security ratings,
 * detailed descriptions, and privacy level explanations.
 */

export type PrivacyTechnology = 
  | "zk-SNARKs" 
  | "Ring Signatures"
  | "Mimblewimble" 
  | "CoinJoin" 
  | "TEE"
  | "Mixnet"
  | "MPC"
  | "Other"
  | "Unknown";

export type PrivacyLevel = "High" | "Medium" | "Minimal";

export interface PrivacyFeatures {
  hiddenAmounts: boolean;
  hiddenSender: boolean;
  hiddenRecipient: boolean;
  defaultPrivacy: boolean; // true = mandatory, false = optional
  ipObfuscation: boolean;
}

export interface PrivacyCoinMetadata {
  coinId: string; // CoinGecko ID
  technology: PrivacyTechnology;
  specificTechnology?: string; // Detailed variant (e.g., "zk-SNARKs Mixer", "CryptoNote")
  privacyLevel: PrivacyLevel; // High, Medium, or Minimal
  privacyScore: number; // 0-100
  features: PrivacyFeatures;
  technologyDescription: string;
  
  // Enhanced metadata (optional fields)
  whitepaperUrl?: string; // Official whitepaper PDF link
  technicalSummary?: string; // 2-3 paragraphs extracted from whitepaper
  releaseYear?: number; // Launch year
  sourceCode?: string; // GitHub repository URL
  auditReports?: string[]; // Security audit links
  isEnhanced?: boolean; // True if fully researched, false if basic/estimated
  
  // Enhanced database fields
  securityRating?: number; // 1-10 scale from comprehensive database
  fullDescription?: string; // Detailed project description from database
  privacySolutionSummary?: string; // 1-2 sentence technical summary from database
  privacyLevelExplanation?: string; // Why this privacy level was assigned
}

/**
 * Privacy metadata for known privacy coins
 * Curated based on technical documentation, security audits, and comprehensive research
 */
export const privacyMetadata: Record<string, PrivacyCoinMetadata> = {\n`;
  
  // Generate metadata entries
  Object.entries(metadata).forEach(([coinId, data], index) => {
    const isLast = index === Object.keys(metadata).length - 1;
    
    code += `  "${coinId}": {\n`;
    code += `    coinId: "${data.coinId}",\n`;
    code += `    technology: "${data.technology}",\n`;
    
    if (data.specificTechnology) {
      code += `    specificTechnology: "${data.specificTechnology.replace(/"/g, '\\"')}",\n`;
    }
    
    code += `    privacyLevel: "${data.privacyLevel}",\n`;
    code += `    privacyScore: ${data.privacyScore},\n`;
    code += `    features: {\n`;
    code += `      hiddenAmounts: ${data.features.hiddenAmounts},\n`;
    code += `      hiddenSender: ${data.features.hiddenSender},\n`;
    code += `      hiddenRecipient: ${data.features.hiddenRecipient},\n`;
    code += `      defaultPrivacy: ${data.features.defaultPrivacy},\n`;
    code += `      ipObfuscation: ${data.features.ipObfuscation},\n`;
    code += `    },\n`;
    code += `    technologyDescription: "${data.technologyDescription.replace(/"/g, '\\"').replace(/\n/g, ' ')}",\n`;
    
    if (data.securityRating) {
      code += `    securityRating: ${data.securityRating},\n`;
    }
    
    if (data.fullDescription) {
      const escaped = data.fullDescription.replace(/"/g, '\\"').replace(/\n/g, ' ');
      code += `    fullDescription: "${escaped}",\n`;
    }
    
    if (data.privacySolutionSummary) {
      const escaped = data.privacySolutionSummary.replace(/"/g, '\\"').replace(/\n/g, ' ');
      code += `    privacySolutionSummary: "${escaped}",\n`;
    }
    
    if (data.privacyLevelExplanation) {
      const escaped = data.privacyLevelExplanation.replace(/"/g, '\\"').replace(/\n/g, ' ');
      code += `    privacyLevelExplanation: "${escaped}",\n`;
    }
    
    if (data.isEnhanced) {
      code += `    isEnhanced: true,\n`;
    }
    
    code += `  }${isLast ? '' : ','}\n\n`;
  });
  
  code += `};\n\n`;
  
  // Add helper functions
  code += `/**
 * Get privacy metadata for a specific coin
 * Returns default "Unknown" metadata if coin not found
 */
export function getPrivacyMetadata(coinId: string): PrivacyCoinMetadata {
  return privacyMetadata[coinId] || {
    coinId,
    technology: "Unknown",
    privacyLevel: "Minimal",
    privacyScore: 0,
    features: {
      hiddenAmounts: false,
      hiddenSender: false,
      hiddenRecipient: false,
      defaultPrivacy: false,
      ipObfuscation: false,
    },
    technologyDescription: "Privacy technology information not yet researched. This coin may have privacy features not yet documented in our database.",
    isEnhanced: false,
  };
}

/**
 * Get color class for technology badge
 */
export function getTechnologyColor(tech: PrivacyTechnology): string {
  const colors: Record<PrivacyTechnology, string> = {
    "zk-SNARKs": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "Ring Signatures": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "Mimblewimble": "bg-green-500/10 text-green-500 border-green-500/20",
    "CoinJoin": "bg-orange-500/10 text-orange-500 border-orange-500/20",
    "TEE": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    "Mixnet": "bg-pink-500/10 text-pink-500 border-pink-500/20",
    "MPC": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "Other": "bg-slate-500/10 text-slate-500 border-slate-500/20",
    "Unknown": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[tech] || colors["Unknown"];
}

/**
 * Get display name for technology
 */
export function getTechnologyDisplayName(tech: PrivacyTechnology): string {
  const names: Record<PrivacyTechnology, string> = {
    "zk-SNARKs": "zk-SNARKs",
    "Ring Signatures": "Ring Sig",
    "Mimblewimble": "MW",
    "CoinJoin": "CoinJoin",
    "TEE": "TEE",
    "Mixnet": "Mixnet",
    "MPC": "MPC",
    "Other": "Other",
    "Unknown": "Unknown",
  };
  return names[tech] || tech;
}

/**
 * Get all unique privacy technologies
 */
export function getAllTechnologies(): PrivacyTechnology[] {
  return ["zk-SNARKs", "Ring Signatures", "Mimblewimble", "CoinJoin", "TEE", "Mixnet", "MPC", "Other", "Unknown"];
}

/**
 * Get color class for privacy level badge
 */
export function getPrivacyLevelColor(level: PrivacyLevel): string {
  const colors: Record<PrivacyLevel, string> = {
    "High": "bg-green-500/10 text-green-500 border-green-500/20",
    "Medium": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "Minimal": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[level];
}

/**
 * Get all privacy levels
 */
export function getAllPrivacyLevels(): PrivacyLevel[] {
  return ["High", "Medium", "Minimal"];
}

/**
 * Get color class for security rating
 */
export function getSecurityRatingColor(rating: number): string {
  if (rating >= 8) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (rating >= 6) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

/**
 * Detect new coins that don't have enhanced metadata
 */
export function detectNewCoins(coinIds: string[]): string[] {
  return coinIds.filter(id => {
    const meta = getPrivacyMetadata(id);
    return !meta.isEnhanced;
  });
}
`;
  
  return code;
}

// Main execution
console.log('🔄 Merging database data with existing metadata...');
const mergedMetadata = mergeData();
console.log(`✅ Merged ${Object.keys(mergedMetadata).length} coins`);

console.log('📝 Generating TypeScript code...');
const code = generateTypeScriptCode(mergedMetadata);

const outputPath = path.join(__dirname, '../data/privacyMetadata.ts');
fs.writeFileSync(outputPath, code);
console.log(`✅ Updated ${outputPath}`);
console.log('✅ Database merge complete!');

