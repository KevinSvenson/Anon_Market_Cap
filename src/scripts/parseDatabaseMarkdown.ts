/**
 * Parser for privacy_coins_database_complete.md
 * Extracts coin data and compares with existing metadata
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

interface Discrepancy {
  coinId: string;
  name: string;
  type: 'privacy_level' | 'technology' | 'privacy_score' | 'missing' | 'new';
  existing?: any;
  database?: any;
  reason?: string;
  impact?: string;
}

// Manual mapping of coin names to CoinGecko IDs
const COIN_NAME_TO_ID: Record<string, string> = {
  'Zcash': 'zcash',
  'Monero': 'monero',
  'Litecoin': 'litecoin',
  'Canton': 'canton-network',
  'Dash': 'dash',
  'Beldex': 'beldex',
  'Decred': 'decred',
  'MimbleWimbleCoin': 'mimblewimblecoin',
  'Horizen': 'zencash',
  'Concordium': 'concordium',
  'Zano': 'zano',
  'Railgun': 'railgun',
  'Oasis': 'oasis-network',
  'Verge': 'verge',
  'ALEO': 'aleo',
  'Anoma': 'anoma',
  'Pirate Chain': 'pirate-chain',
  'COTI': 'coti',
  'Firo': 'zcoin',
  'Status': 'status',
  'Nillion': 'nillion',
  'Secret': 'secret',
  'iExec RLC': 'iexec-rlc',
  'Tornado Cash': 'tornado-cash',
  'Ergo': 'ergo',
  'Nym': 'nym',
  'DUSK': 'dusk-network',
  'ZERA': 'zera',
  'ANyONe Protocol': 'airtor-protocol',
  'PIVX': 'pivx',
  'Abelian': 'abelian',
  'Bityuan': 'bityuan',
  'HOPR': 'hopr',
  'ARPA': 'arpa',
  'Telos': 'telos',
  'Houdini Swap': 'houdini-swap',
  'Veil Token': 'veil-token',
  'Zephyr Protocol': 'zephyr-protocol',
  'BEAM': 'beam-2',
  'Ycash': 'ycash',
  'Namada': 'namada',
  'Grin': 'grin',
  'MinoTari': 'minotari',
  'Lit Protocol': 'lit-protocol',
  'GhostwareOS': 'ghostwareos',
  'Freedom Dollar': 'freedom-dollar',
  'Data Ownership Protocol 2': 'data-ownership-protocol-2',
  'Epic Cash': 'epic-cash',
  'zKML': 'zkml',
  'Dero': 'dero',
  'Umbra': 'umbra',
  'Sentinel': 'sentinel',
  'Bytecoin': 'bytecoin',
  'Zclassic': 'zclassic',
  'MUTE SWAP by Virtuals': 'mute-swap-by-virtuals',
  'Panther Protocol': 'panther',
  'Xcellar': 'xcellar',
  'Aleph Zero': 'aleph-zero',
  'Particl': 'particl',
  'NONOS': 'nonos-2',
  'Navio': 'nav-coin',
  'Xelis': 'xelis',
  'Session Token': 'session-token',
  'Penumbra': 'penumbra',
  'Machines-cash': 'machines-cash',
  'Loyal': 'loyal',
  'Salvium': 'salvium',
  'Privasea AI': 'privasea-ai',
  'Jackal Protocol': 'jackal-protocol',
  'PRXVT by Virtuals': 'prxvt-by-virtuals',
  'Ghost': 'ghost',
  'RADR': 'radr',
  'ZKLSOL': 'zklsol',
  'Ryo Currency': 'ryo',
  'BitcoinZ': 'bitcoinz',
  'Hush': 'hush',
  'Cloakcoin': 'cloakcoin',
  'Voidify': '-7',
  'Karbo': 'karbo',
  'NullTrace': 'nulltrace',
  'Kryptokrona': 'kryptokrona',
  'Conceal': 'conceal',
  'Synk': 'synk',
  'Zero': 'zero',
  'Scala': 'stellite',
  'Offshift': 'offshift',
  'Tritcoin': 'tritcoin',
  'PRivaCY Coin': 'prcy-coin',
  'Spectre': 'spectre-network',
  'OSCA Stack': 'osca-stack',
  'Lethe': 'lethe',
  'Axe': 'axe',
  'Lumora': 'lumora',
  'BlockWallet': 'blank',
  'CryptoDM': 'cryptodm',
  'nullifier': 'nullifier',
  'IncogniFi': 'incognifi',
  'hushr': 'hushr',
  'Enkrion': 'enkrion',
  'Chapo': 'chapo'
};

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

function parseCoinSection(sectionText: string): ParsedCoinData | null {
  try {
    // Extract coin name and symbol
    const nameMatch = sectionText.match(/^##\s+\*\*([^(]+)\s+\(([^)]+)\)\*\*/);
    if (!nameMatch) return null;
    
    const name = nameMatch[1].trim();
    const symbol = nameMatch[2].trim();
    const coinId = COIN_NAME_TO_ID[name] || name.toLowerCase().replace(/\s+/g, '-');
    
    // Extract full description
    const descMatch = sectionText.match(/\*\*Full Description:\*\*\s+(.*?)(?=\n\*\*Privacy Solution Summary:\*\*)/s);
    const fullDescription = descMatch ? descMatch[1].trim() : '';
    
    // Extract privacy solution summary
    const summaryMatch = sectionText.match(/\*\*Privacy Solution Summary:\*\*\s+(.*?)(?=\n\*\*Privacy Tech Category:\*\*)/s);
    const privacySolutionSummary = summaryMatch ? summaryMatch[1].trim() : '';
    
    // Extract privacy tech category
    const techMatch = sectionText.match(/\*\*Privacy Tech Category:\*\*\s+(.*?)(?=\n\*\*Security Rating:\*\*)/s);
    const privacyTechCategory = techMatch ? techMatch[1].trim() : '';
    
    // Extract security rating
    const ratingMatch = sectionText.match(/\*\*Security Rating:\*\*\s+(\d+)\/10/);
    const securityRating = ratingMatch ? parseInt(ratingMatch[1]) : 5;
    
    // Extract privacy level
    const levelMatch = sectionText.match(/\*\*Privacy Level:\s*(High|Medium|Minimal)\*\*/);
    const privacyLevel = (levelMatch ? levelMatch[1] : 'Minimal') as PrivacyLevel;
    
    // Extract privacy level explanation
    const explMatch = sectionText.match(/\*\*Explanation:\*\*\s+(.*?)(?=\n---|$)/s);
    const privacyLevelExplanation = explMatch ? explMatch[1].trim() : '';
    
    return {
      name,
      symbol,
      coinId,
      fullDescription,
      privacySolutionSummary,
      privacyTechCategory,
      securityRating,
      privacyLevel,
      privacyLevelExplanation
    };
  } catch (error) {
    console.error(`Error parsing coin section: ${error}`);
    return null;
  }
}

function compareWithExisting(parsed: ParsedCoinData): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const existing = privacyMetadata[parsed.coinId];
  
  if (!existing) {
    discrepancies.push({
      coinId: parsed.coinId,
      name: parsed.name,
      type: 'new',
      database: parsed,
      reason: 'Coin exists in database but not in current metadata',
      impact: 'Will be added to metadata'
    });
    return discrepancies;
  }
  
  // Check privacy level
  if (existing.privacyLevel !== parsed.privacyLevel) {
    discrepancies.push({
      coinId: parsed.coinId,
      name: parsed.name,
      type: 'privacy_level',
      existing: existing.privacyLevel,
      database: parsed.privacyLevel,
      reason: `Privacy level differs: ${existing.privacyLevel} → ${parsed.privacyLevel}`,
      impact: 'Table and detail page will show database value'
    });
  }
  
  // Check technology mapping
  const dbTech = mapTechnology(parsed.privacyTechCategory);
  if (existing.technology !== dbTech) {
    discrepancies.push({
      coinId: parsed.coinId,
      name: parsed.name,
      type: 'technology',
      existing: existing.technology,
      database: dbTech,
      reason: `Technology category differs: ${existing.technology} → ${dbTech} (from "${parsed.privacyTechCategory}")`,
      impact: 'Table and detail page will show database value'
    });
  }
  
  return discrepancies;
}

function parseDatabase(markdownPath: string): { coins: ParsedCoinData[], discrepancies: Discrepancy[] } {
  const content = fs.readFileSync(markdownPath, 'utf-8');
  
  // Split by coin sections (## **Coin Name (SYMBOL)**)
  const sections = content.split(/(?=^## \*\*[^*]+\*\*$)/m);
  
  const coins: ParsedCoinData[] = [];
  const allDiscrepancies: Discrepancy[] = [];
  
  for (const section of sections) {
    if (section.trim().startsWith('## **')) {
      const parsed = parseCoinSection(section);
      if (parsed) {
        coins.push(parsed);
        const discrepancies = compareWithExisting(parsed);
        allDiscrepancies.push(...discrepancies);
      }
    }
  }
  
  // Check for coins in existing metadata that aren't in database
  Object.keys(privacyMetadata).forEach(coinId => {
    if (!coins.find(c => c.coinId === coinId)) {
      allDiscrepancies.push({
        coinId,
        name: privacyMetadata[coinId].coinId,
        type: 'missing',
        reason: 'Coin exists in current metadata but not in database',
        impact: 'Will keep existing metadata'
      });
    }
  });
  
  return { coins, discrepancies: allDiscrepancies };
}

function generateReports(coins: ParsedCoinData[], discrepancies: Discrepancy[]) {
  const outputDir = path.join(__dirname, '../../');
  
  // Write parsed coins data
  fs.writeFileSync(
    path.join(outputDir, 'parsed-coins-data.json'),
    JSON.stringify(coins, null, 2)
  );
  
  // Write discrepancy report
  const report = {
    totalCoins: coins.length,
    totalDiscrepancies: discrepancies.length,
    discrepanciesByType: {
      privacy_level: discrepancies.filter(d => d.type === 'privacy_level').length,
      technology: discrepancies.filter(d => d.type === 'technology').length,
      new: discrepancies.filter(d => d.type === 'new').length,
      missing: discrepancies.filter(d => d.type === 'missing').length
    },
    discrepancies: discrepancies
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'discrepancy-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Write human-readable report
  let readableReport = `DISCREPANCY REPORT\n`;
  readableReport += `==================\n\n`;
  readableReport += `Total coins parsed: ${coins.length}\n`;
  readableReport += `Total discrepancies found: ${discrepancies.length}\n\n`;
  
  if (discrepancies.length === 0) {
    readableReport += `No discrepancies found! All data matches.\n`;
  } else {
    readableReport += `Breakdown by type:\n`;
    readableReport += `- Privacy Level mismatches: ${report.discrepanciesByType.privacy_level}\n`;
    readableReport += `- Technology category mismatches: ${report.discrepanciesByType.technology}\n`;
    readableReport += `- New coins (in database only): ${report.discrepanciesByType.new}\n`;
    readableReport += `- Missing coins (in metadata only): ${report.discrepanciesByType.missing}\n\n`;
    readableReport += `DETAILED DISCREPANCIES:\n`;
    readableReport += `=======================\n\n`;
    
    discrepancies.forEach((d, i) => {
      readableReport += `${i + 1}. ${d.name} (${d.coinId})\n`;
      readableReport += `   Type: ${d.type}\n`;
      if (d.existing !== undefined) {
        readableReport += `   Current: ${d.existing}\n`;
      }
      if (d.database !== undefined) {
        readableReport += `   Database: ${d.database}\n`;
      }
      if (d.reason) {
        readableReport += `   Reason: ${d.reason}\n`;
      }
      if (d.impact) {
        readableReport += `   Impact: ${d.impact}\n`;
      }
      readableReport += `\n`;
    });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'discrepancy-report.txt'),
    readableReport
  );
  
  console.log('✅ Reports generated:');
  console.log('   - parsed-coins-data.json');
  console.log('   - discrepancy-report.json');
  console.log('   - discrepancy-report.txt');
  console.log('');
  console.log(`📊 Summary: Parsed ${coins.length} coins, found ${discrepancies.length} discrepancies`);
}

// Main execution
const markdownPath = path.join(__dirname, '../../privacy_coins_database_complete.md');

if (!fs.existsSync(markdownPath)) {
  console.error('❌ Error: privacy_coins_database_complete.md not found!');
  console.error(`   Expected location: ${markdownPath}`);
  process.exit(1);
}

console.log('🔍 Parsing database...');
const { coins, discrepancies } = parseDatabase(markdownPath);
console.log('📝 Generating reports...');
generateReports(coins, discrepancies);
console.log('✅ Done! Review discrepancy-report.txt before proceeding.');

