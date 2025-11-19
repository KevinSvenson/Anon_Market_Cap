/**
 * Auto-detect correct CoinGecko IDs for all database coins
 * Uses CoinGecko's search API to find the correct ID for each coin
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParsedCoinData {
  name: string;
  symbol: string;
  coinId: string;
}

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

interface DetectedId {
  databaseName: string;
  symbol: string;
  oldId: string;
  newId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search CoinGecko for a coin by name or symbol
 */
async function searchCoinGecko(query: string): Promise<CoinGeckoSearchResult[]> {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.log('⏳ Rate limited, waiting 10 seconds...');
      await delay(10000);
      return searchCoinGecko(query); // Retry
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.coins || [];
  } catch (error) {
    console.error(`Error searching for "${query}":`, error);
    return [];
  }
}

/**
 * Find best match for a coin
 */
function findBestMatch(
  coinName: string,
  coinSymbol: string,
  results: CoinGeckoSearchResult[]
): { id: string; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  
  if (results.length === 0) {
    return null;
  }
  
  const normalizedName = coinName.toLowerCase().trim();
  const normalizedSymbol = coinSymbol.toLowerCase().trim();
  
  // Priority 1: Exact name AND symbol match
  const exactMatch = results.find(
    r => r.name.toLowerCase() === normalizedName && r.symbol.toLowerCase() === normalizedSymbol
  );
  if (exactMatch) {
    return {
      id: exactMatch.id,
      confidence: 'high',
      reason: 'Exact name and symbol match'
    };
  }
  
  // Priority 2: Exact symbol match with similar name
  const symbolMatches = results.filter(r => r.symbol.toLowerCase() === normalizedSymbol);
  if (symbolMatches.length === 1) {
    return {
      id: symbolMatches[0].id,
      confidence: 'high',
      reason: 'Exact symbol match'
    };
  }
  if (symbolMatches.length > 1) {
    // Multiple symbol matches - prefer one with similar name
    const similarName = symbolMatches.find(r => 
      r.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(r.name.toLowerCase())
    );
    if (similarName) {
      return {
        id: similarName.id,
        confidence: 'medium',
        reason: 'Symbol match with similar name'
      };
    }
    // Prefer one with higher market cap rank
    const ranked = symbolMatches.filter(r => r.market_cap_rank !== null);
    if (ranked.length > 0) {
      ranked.sort((a, b) => (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999));
      return {
        id: ranked[0].id,
        confidence: 'medium',
        reason: `Symbol match, highest ranked (${ranked[0].market_cap_rank})`
      };
    }
  }
  
  // Priority 3: Name contains or is contained
  const nameMatch = results.find(r => {
    const resultName = r.name.toLowerCase();
    return resultName.includes(normalizedName) || normalizedName.includes(resultName);
  });
  if (nameMatch) {
    return {
      id: nameMatch.id,
      confidence: 'medium',
      reason: 'Partial name match'
    };
  }
  
  // Priority 4: First result (lowest confidence)
  return {
    id: results[0].id,
    confidence: 'low',
    reason: 'Best guess from search results'
  };
}

/**
 * Auto-detect IDs for all coins
 */
async function autoDetectIds(): Promise<DetectedId[]> {
  // Read parsed coins data
  const parsedCoinsPath = path.join(__dirname, '../../parsed-coins-data.json');
  const parsedCoins: ParsedCoinData[] = JSON.parse(fs.readFileSync(parsedCoinsPath, 'utf-8'));
  
  console.log(`🔍 Auto-detecting CoinGecko IDs for ${parsedCoins.length} coins...`);
  console.log('⏱️  This will take ~5-10 minutes due to rate limiting\n');
  
  const detectedIds: DetectedId[] = [];
  let processed = 0;
  
  for (const coin of parsedCoins) {
    processed++;
    console.log(`[${processed}/${parsedCoins.length}] Searching for: ${coin.name} (${coin.symbol})...`);
    
    // Try searching by name first
    let results = await searchCoinGecko(coin.name);
    
    // If no results, try symbol
    if (results.length === 0) {
      console.log(`   No results for name, trying symbol...`);
      results = await searchCoinGecko(coin.symbol);
    }
    
    if (results.length === 0) {
      console.log(`   ❌ No results found\n`);
      continue;
    }
    
    const match = findBestMatch(coin.name, coin.symbol, results);
    
    if (match) {
      const isChanged = match.id !== coin.coinId;
      
      if (isChanged) {
        console.log(`   ✅ Found: ${match.id} (${match.confidence} confidence - ${match.reason})`);
        console.log(`   📝 Change: ${coin.coinId} → ${match.id}\n`);
        
        detectedIds.push({
          databaseName: coin.name,
          symbol: coin.symbol,
          oldId: coin.coinId,
          newId: match.id,
          confidence: match.confidence,
          reason: match.reason
        });
      } else {
        console.log(`   ✓ Confirmed: ${match.id} (no change needed)\n`);
      }
    }
    
    // Rate limiting: wait 2 seconds between requests
    if (processed < parsedCoins.length) {
      await delay(2000);
    }
  }
  
  return detectedIds;
}

/**
 * Generate corrected mapping
 */
function generateCorrectedMapping(detectedIds: DetectedId[]): Record<string, string> {
  const parsedCoinsPath = path.join(__dirname, '../../parsed-coins-data.json');
  const parsedCoins: ParsedCoinData[] = JSON.parse(fs.readFileSync(parsedCoinsPath, 'utf-8'));
  
  const mapping: Record<string, string> = {};
  
  // Start with all coins using either detected ID or original
  parsedCoins.forEach(coin => {
    const detected = detectedIds.find(d => d.databaseName === coin.name);
    mapping[coin.name] = detected ? detected.newId : coin.coinId;
  });
  
  return mapping;
}

/**
 * Generate reports
 */
function generateReports(detectedIds: DetectedId[], mapping: Record<string, string>) {
  const outputDir = path.join(__dirname, '../../');
  
  // Save corrected mapping
  fs.writeFileSync(
    path.join(outputDir, 'corrected-coin-ids.json'),
    JSON.stringify(mapping, null, 2)
  );
  
  // Save detection report
  const report = {
    totalCoinsProcessed: Object.keys(mapping).length,
    changesDetected: detectedIds.length,
    byConfidence: {
      high: detectedIds.filter(d => d.confidence === 'high').length,
      medium: detectedIds.filter(d => d.confidence === 'medium').length,
      low: detectedIds.filter(d => d.confidence === 'low').length
    },
    changes: detectedIds
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'id-detection-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Human-readable report
  let readableReport = `COINGECKO ID DETECTION REPORT\n`;
  readableReport += `================================\n\n`;
  readableReport += `Total coins processed: ${report.totalCoinsProcessed}\n`;
  readableReport += `ID changes detected: ${report.changesDetected}\n\n`;
  readableReport += `Confidence breakdown:\n`;
  readableReport += `- High confidence: ${report.byConfidence.high}\n`;
  readableReport += `- Medium confidence: ${report.byConfidence.medium}\n`;
  readableReport += `- Low confidence: ${report.byConfidence.low}\n\n`;
  
  if (detectedIds.length > 0) {
    readableReport += `DETECTED CHANGES:\n`;
    readableReport += `=================\n\n`;
    
    detectedIds.forEach((change, i) => {
      readableReport += `${i + 1}. ${change.databaseName} (${change.symbol})\n`;
      readableReport += `   Old ID: ${change.oldId}\n`;
      readableReport += `   New ID: ${change.newId}\n`;
      readableReport += `   Confidence: ${change.confidence}\n`;
      readableReport += `   Reason: ${change.reason}\n\n`;
    });
  } else {
    readableReport += `No ID changes needed - all mappings are correct!\n`;
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'id-detection-report.txt'),
    readableReport
  );
  
  console.log('\n✅ Reports generated:');
  console.log('   - corrected-coin-ids.json');
  console.log('   - id-detection-report.json');
  console.log('   - id-detection-report.txt');
  console.log('');
  console.log(`📊 Summary: ${report.changesDetected} ID corrections needed`);
}

// Main execution
async function main() {
  console.log('🚀 Starting CoinGecko ID auto-detection...\n');
  
  const detectedIds = await autoDetectIds();
  const mapping = generateCorrectedMapping(detectedIds);
  
  console.log('\n📝 Generating reports...');
  generateReports(detectedIds, mapping);
  
  console.log('\n✅ Done! Review id-detection-report.txt for details.');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

