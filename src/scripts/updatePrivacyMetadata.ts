/**
 * Batch processing script to update privacy metadata for all coins
 * 
 * Usage: npx tsx src/scripts/updatePrivacyMetadata.ts
 * 
 * This script will:
 * 1. Fetch all privacy coins from CoinGecko
 * 2. For each coin, fetch detailed data from CoinPaprika
 * 3. Categorize using keyword analysis
 * 4. Generate new metadata file
 * 5. Create review report
 */

import { fetchCoinPaprikaData, getCoinPaprikaId, fetchCoinGeckoDescription, delay } from "./fetchCoinData";
import { categorizeCoin, calculatePrivacyScore } from "./categorizeCoin";
import type { PrivacyCoinMetadata, PrivacyFeatures } from "../data/privacyMetadata";

interface ProcessingResult {
  coinId: string;
  success: boolean;
  metadata?: PrivacyCoinMetadata;
  error?: string;
  confidence?: number;
}

/**
 * Fetch privacy coins list from CoinGecko
 */
async function fetchPrivacyCoinsList(): Promise<string[]> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=privacy-coins&per_page=250&page=1"
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((coin: any) => coin.id);
  } catch (error) {
    console.error("Error fetching privacy coins list:", error);
    return [];
  }
}

/**
 * Infer privacy features based on technology and description
 */
function inferPrivacyFeatures(
  technology: string,
  description: string
): PrivacyFeatures {
  const lowerDesc = description.toLowerCase();
  
  // Technology-based defaults
  const defaults: Record<string, Partial<PrivacyFeatures>> = {
    "zk-SNARKs": {
      hiddenAmounts: true,
      hiddenSender: true,
      hiddenRecipient: true,
      defaultPrivacy: lowerDesc.includes("mandatory") || lowerDesc.includes("100%"),
      ipObfuscation: false
    },
    "RingCT": {
      hiddenAmounts: true,
      hiddenSender: true,
      hiddenRecipient: true,
      defaultPrivacy: true,
      ipObfuscation: lowerDesc.includes("dandelion") || lowerDesc.includes("tor")
    },
    "Ring Signatures": {
      hiddenAmounts: true,
      hiddenSender: true,
      hiddenRecipient: true,
      defaultPrivacy: true,
      ipObfuscation: false
    },
    "Mimblewimble": {
      hiddenAmounts: true,
      hiddenSender: true,
      hiddenRecipient: true,
      defaultPrivacy: true,
      ipObfuscation: lowerDesc.includes("dandelion")
    },
    "CoinJoin": {
      hiddenAmounts: false,
      hiddenSender: true,
      hiddenRecipient: true,
      defaultPrivacy: false,
      ipObfuscation: false
    },
    "Stealth Addresses": {
      hiddenAmounts: false,
      hiddenSender: false,
      hiddenRecipient: true,
      defaultPrivacy: false,
      ipObfuscation: false
    }
  };
  
  const base = defaults[technology] || {
    hiddenAmounts: false,
    hiddenSender: false,
    hiddenRecipient: false,
    defaultPrivacy: false,
    ipObfuscation: false
  };
  
  // Override with description clues
  return {
    hiddenAmounts: base.hiddenAmounts ?? lowerDesc.includes("confidential transaction"),
    hiddenSender: base.hiddenSender ?? lowerDesc.includes("anonymous"),
    hiddenRecipient: base.hiddenRecipient ?? lowerDesc.includes("stealth"),
    defaultPrivacy: base.defaultPrivacy ?? lowerDesc.includes("mandatory"),
    ipObfuscation: base.ipObfuscation ?? (lowerDesc.includes("tor") || lowerDesc.includes("i2p"))
  };
}

/**
 * Generate technology description based on categorization
 */
function generateTechnologyDescription(
  technology: string,
  specificTechnology: string | undefined,
  originalDescription: string
): string {
  // Base templates for each technology
  const templates: Record<string, string> = {
    "zk-SNARKs": "Uses zero-knowledge proofs (zk-SNARKs) to enable private transactions that hide sender, recipient, and transaction amounts. ",
    "RingCT": "Implements Ring Confidential Transactions (RingCT) combining ring signatures, stealth addresses, and confidential transactions for comprehensive privacy. ",
    "Ring Signatures": "Uses ring signatures and stealth addresses to obfuscate transaction origins and protect sender/recipient privacy. ",
    "Mimblewimble": "Built on Mimblewimble protocol providing privacy through confidential transactions and cut-through, which eliminates transaction history. ",
    "CoinJoin": "Provides optional privacy through CoinJoin mixing, which combines multiple transactions to obscure the link between senders and recipients. ",
    "Stealth Addresses": "Uses stealth addresses to protect recipient privacy by generating one-time addresses for each transaction. "
  };
  
  let description = templates[technology] || "";
  
  // Add specific technology context if available
  if (specificTechnology) {
    description = `Utilizes ${specificTechnology} for privacy. ${description}`;
  }
  
  // Append original description (first 200 chars) if not too generic
  const cleanDesc = originalDescription
    .replace(/^what is \w+\?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
    
  if (cleanDesc.length > 30 && cleanDesc.length < 300) {
    description += cleanDesc;
  }
  
  // Add data attribution
  description += " (Data source: CoinPaprika + automated categorization)";
  
  return description;
}

/**
 * Process a single coin
 */
async function processCoin(coinId: string): Promise<ProcessingResult> {
  console.log(`Processing ${coinId}...`);
  
  try {
    // Fetch CoinGecko description (more detailed)
    const geckoDescription = await fetchCoinGeckoDescription(coinId);
    
    if (!geckoDescription) {
      console.warn(`  ⚠️  Failed to fetch CoinGecko description for ${coinId}`);
      return {
        coinId,
        success: false,
        error: "Failed to fetch CoinGecko description"
      };
    }
    
    // Add small delay after CoinGecko request
    await delay(1500);
    
    // Get CoinPaprika ID for whitepaper/links
    const paprikaId = getCoinPaprikaId(coinId);
    let paprikaData = null;
    
    if (paprikaId) {
      paprikaData = await fetchCoinPaprikaData(paprikaId);
      await delay(1000); // Delay after CoinPaprika too
    }
    
    // Categorize using CoinGecko description (more detailed) + CoinPaprika tags
    const categorization = categorizeCoin({
      description: geckoDescription,
      tags: paprikaData?.tags?.map(t => t.name) || [],
      name: paprikaData?.name || coinId,
      symbol: paprikaData?.symbol || ""
    });
    
    console.log(`  📊 Category: ${categorization.technology} (confidence: ${categorization.confidence}%)`);
    if (categorization.specificTechnology) {
      console.log(`  🔍 Specific: ${categorization.specificTechnology}`);
    }
    
    // Infer features
    const features = inferPrivacyFeatures(categorization.technology, geckoDescription);
    
    // Calculate privacy score
    const privacyScore = calculatePrivacyScore({
      technology: categorization.technology,
      hasDefaultPrivacy: features.defaultPrivacy,
      hasIPObfuscation: features.ipObfuscation
    });
    
    // Generate description
    const technologyDescription = generateTechnologyDescription(
      categorization.technology,
      categorization.specificTechnology,
      geckoDescription
    );
    
    // Build metadata
    const metadata: PrivacyCoinMetadata = {
      coinId,
      technology: categorization.technology,
      specificTechnology: categorization.specificTechnology,
      privacyScore,
      features,
      technologyDescription,
      whitepaperUrl: paprikaData?.whitepaper?.link,
      sourceCode: paprikaData?.links?.source_code?.[0],
      releaseYear: paprikaData?.started_at ? new Date(paprikaData.started_at).getFullYear() : undefined,
      isEnhanced: categorization.confidence >= 70 // Only mark as enhanced if confident
    };
    
    console.log(`  ✅ Success (score: ${privacyScore})`);
    
    return {
      coinId,
      success: true,
      metadata,
      confidence: categorization.confidence
    };
    
  } catch (error) {
    console.error(`  ❌ Error processing ${coinId}:`, error);
    return {
      coinId,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Starting privacy metadata update...\n");
  
  // Check for test mode
  const isTestMode = process.argv.includes("--test");
  
  // Fetch coin list
  console.log("📥 Fetching privacy coins list from CoinGecko...");
  let coinIds = await fetchPrivacyCoinsList();
  console.log(`   Found ${coinIds.length} privacy coins\n`);
  
  if (coinIds.length === 0) {
    console.error("❌ No coins found. Exiting.");
    return;
  }
  
  // Test mode: only process first 5 coins
  if (isTestMode) {
    console.log("🧪 TEST MODE: Processing only first 5 coins\n");
    coinIds = coinIds.slice(0, 5);
  }
  
  // Process each coin
  const results: ProcessingResult[] = [];
  const DELAY_MS = 4000; // 4 seconds between coins to avoid rate limits
  
  for (let i = 0; i < coinIds.length; i++) {
    const coinId = coinIds[i];
    const result = await processCoin(coinId);
    results.push(result);
    
    // Rate limiting delay (except for last coin)
    if (i < coinIds.length; i++) {
      console.log(`  ⏳ Waiting ${DELAY_MS/1000}s before next coin...\n`);
      await delay(DELAY_MS);
    }
  }
  
  // Generate summary report
  console.log("\n" + "=".repeat(60));
  console.log("📊 PROCESSING SUMMARY");
  console.log("=".repeat(60) + "\n");
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  // Category breakdown
  const byTechnology: Record<string, number> = {};
  successful.forEach(r => {
    const tech = r.metadata?.technology || "Unknown";
    byTechnology[tech] = (byTechnology[tech] || 0) + 1;
  });
  
  console.log("📈 Technology Distribution:");
  Object.entries(byTechnology)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tech, count]) => {
      console.log(`   ${tech}: ${count}`);
    });
  
  // Confidence breakdown
  const lowConfidence = successful.filter(r => (r.confidence || 0) < 70);
  if (lowConfidence.length > 0) {
    console.log(`\n⚠️  Low confidence (< 70%): ${lowConfidence.length} coins`);
    lowConfidence.forEach(r => {
      console.log(`   - ${r.coinId}: ${r.confidence}% (${r.metadata?.technology})`);
    });
  }
  
  // Failed coins
  if (failed.length > 0) {
    console.log(`\n❌ Failed coins:`);
    failed.forEach(r => {
      console.log(`   - ${r.coinId}: ${r.error}`);
    });
  }
  
  // Generate TypeScript code
  console.log("\n" + "=".repeat(60));
  console.log("📝 GENERATING METADATA FILE");
  console.log("=".repeat(60) + "\n");
  
  const metadataEntries = successful
    .filter(r => r.metadata)
    .map(r => {
      const m = r.metadata!;
      return `  "${m.coinId}": ${JSON.stringify(m, null, 4).replace(/^/gm, "  ").trim()}`;
    })
    .join(",\n\n");
  
  const outputCode = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated: ${new Date().toISOString()}
// Source: CoinPaprika API + Automated Categorization

export const privacyMetadata: Record<string, PrivacyCoinMetadata> = {
${metadataEntries}
};`;
  
  console.log("✅ Metadata generation complete!");
  console.log(`\n💾 Save this output to: src/data/privacyMetadata.ts`);
  console.log(`\n⚠️  IMPORTANT: Review low-confidence coins before deploying!\n`);
  
  // Write to file
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "../../generated-metadata.txt");
  fs.writeFileSync(outputPath, outputCode, "utf8");
  console.log(`📁 Output saved to: ${outputPath}\n`);
}

// Run
main().catch(console.error);

