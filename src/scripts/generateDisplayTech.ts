/**
 * Automatically generates displayTech labels for coins showing "Other"
 * Extracts 1-2 word labels from full technology descriptions
 */

import { privacyMetadata } from '../data/privacyMetadata';

// Rules for extracting short labels from descriptions
const extractDisplayTech = (description: string, specificTech?: string): string | null => {
  // First, check specificTechnology if available (usually more concise)
  const textToAnalyze = specificTech || description;
  const desc = textToAnalyze.toLowerCase();
  
  // Priority 1: Look for specific protocol names (usually capitalized)
  // Examples: "Lelantus", "Mimblewimble", "Sigma", "RingCT"
  const protocolMatch = textToAnalyze.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/);
  if (protocolMatch && protocolMatch[1].length <= 12) {
    const protocol = protocolMatch[1];
    // Skip common words that aren't protocol names
    if (!['Private', 'Confidential', 'Optional', 'Transparent', 'Identity'].includes(protocol)) {
      return protocol;
    }
  }
  
  // Priority 2: Look for key technology terms
  const techPatterns = [
    { pattern: /zk-?snarks?/i, label: 'zk-SNARKs' },
    { pattern: /zk-?starks?/i, label: 'zk-STARKs' },
    { pattern: /zk[- ]based/i, label: 'zk-based' },
    { pattern: /zero[- ]?knowledge/i, label: 'ZK' },
    { pattern: /ring signatures?/i, label: 'Ring Sig' },
    { pattern: /ringct\b/i, label: 'RingCT' },
    { pattern: /stealth address/i, label: 'Stealth' },
    { pattern: /confidential transactions?/i, label: 'Confidential' },
    { pattern: /homomorphic/i, label: 'Homomorphic' },
    { pattern: /tor\b/i, label: 'Tor' },
    { pattern: /i2p\b/i, label: 'I2P' },
    { pattern: /vpn\b/i, label: 'VPN' },
    { pattern: /onion routing/i, label: 'Onion' },
    { pattern: /mixing/i, label: 'Mixing' },
    { pattern: /coinjoin/i, label: 'CoinJoin' },
    { pattern: /tumbl/i, label: 'Tumbling' },
    { pattern: /optional privacy/i, label: 'Optional' },
    { pattern: /transparent.*optional/i, label: 'Optional' },
    { pattern: /identity[- ]linked/i, label: 'ID-Link' },
    { pattern: /proof of stake/i, label: 'PoS-Privacy' },
    { pattern: /mpc\b/i, label: 'MPC' },
    { pattern: /secure enclave/i, label: 'TEE' },
    { pattern: /trusted execution/i, label: 'TEE' },
    { pattern: /sigma protocols?/i, label: 'Sigma' },
    { pattern: /zerocoin/i, label: 'Zerocoin' },
    { pattern: /lelantus/i, label: 'Lelantus' },
    { pattern: /mimblewimble/i, label: 'Mimblewimble' },
  ];
  
  for (const { pattern, label } of techPatterns) {
    if (pattern.test(desc)) {
      return label;
    }
  }
  
  // Priority 3: Extract first meaningful word/phrase from specificTechnology
  if (specificTech) {
    // Try to extract first 1-2 words before "/" or " / "
    const beforeSlash = specificTech.split(/[\/]/)[0].trim();
    if (beforeSlash.length > 0 && beforeSlash.length <= 20) {
      // Remove common prefixes but keep meaningful tech terms
      const cleaned = beforeSlash
        .replace(/^(zk-?based|zk-?|private|confidential|optional|transparent|ethereum|identity[- ]linked)\s*/i, '')
        .trim();
      
      // If we have something meaningful after cleaning
      if (cleaned.length > 0 && cleaned.length <= 15) {
        // Skip if it's still too generic
        const genericTerms = ['payments', 'transactions', 'ledger', 'wallet', 'messaging', 'stablecoin'];
        const isGeneric = genericTerms.some(term => cleaned.toLowerCase().includes(term));
        if (!isGeneric) {
          return cleaned;
        }
      }
      
      // If cleaned is empty or generic, try extracting key words
      const words = beforeSlash.split(/\s+/);
      // Look for capitalized words (likely protocol names)
      const capitalizedWords = words.filter(w => /^[A-Z][a-z]+/.test(w) && w.length <= 12);
      if (capitalizedWords.length > 0) {
        const firstCap = capitalizedWords[0];
        // Skip generic terms
        if (!['Private', 'Confidential', 'Optional', 'Transparent', 'Ethereum', 'Identity'].includes(firstCap)) {
          return firstCap;
        }
      }
    }
  }
  
  // Priority 4: Extract from specificTechnology patterns
  if (specificTech) {
    // Look for patterns like "X / Y" and extract the more specific part
    const parts = specificTech.split(/\s*\/\s*/);
    for (const part of parts) {
      const trimmed = part.trim();
      // Look for protocol-like names (capitalized, short)
      if (/^[A-Z][a-z]+$/.test(trimmed) && trimmed.length <= 12) {
        if (!['Private', 'Confidential', 'Optional', 'Transparent'].includes(trimmed)) {
          return trimmed;
        }
      }
      // Look for compound terms like "Stealth Address"
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmed)) {
        const firstWord = trimmed.split(/\s+/)[0];
        if (firstWord.length <= 10 && !['Private', 'Confidential', 'Optional'].includes(firstWord)) {
          return firstWord;
        }
      }
    }
  }
  
  // Priority 5: Look for key feature words (fallback, but avoid generic "Private")
  const featurePatterns = [
    { pattern: /stealth/i, label: 'Stealth' },
    { pattern: /anonymous/i, label: 'Anonymous' },
    { pattern: /obfuscat/i, label: 'Obfuscated' },
    { pattern: /encrypt/i, label: 'Encrypted' },
  ];
  
  for (const { pattern, label } of featurePatterns) {
    if (pattern.test(desc)) {
      return label;
    }
  }
  
  return null; // No good label found, keep "Other"
};

// Generate displayTech for all coins with technology: "Other"
const generateDisplayTechLabels = () => {
  const results: Array<{
    id: string;
    currentTech: string;
    specificTech?: string;
    description: string;
    suggestedDisplayTech: string | null;
    alreadyHasDisplayTech: boolean;
  }> = [];
  
  Object.entries(privacyMetadata).forEach(([id, metadata]) => {
    if (metadata.technology === 'Other') {
      const suggestedLabel = extractDisplayTech(
        metadata.technologyDescription || '',
        metadata.specificTechnology
      );
      
      results.push({
        id,
        currentTech: metadata.technology,
        specificTech: metadata.specificTechnology,
        description: (metadata.technologyDescription || '').slice(0, 100),
        suggestedDisplayTech: suggestedLabel,
        alreadyHasDisplayTech: !!metadata.displayTech,
      });
    }
  });
  
  return results;
};

// Run and output results
console.log('=== Generating displayTech labels for "Other" coins ===\n');
const results = generateDisplayTechLabels();

const withSuggestions = results.filter(r => r.suggestedDisplayTech);
const withoutSuggestions = results.filter(r => !r.suggestedDisplayTech);
const alreadyHas = results.filter(r => r.alreadyHasDisplayTech);

console.log(`Found ${results.length} coins with technology: "Other"`);
console.log(`  - ${alreadyHas.length} already have displayTech`);
console.log(`  - ${withSuggestions.length} have suggested labels`);
console.log(`  - ${withoutSuggestions.length} need manual review\n`);

// Show coins that need displayTech
const needsDisplayTech = results.filter(r => !r.alreadyHasDisplayTech && r.suggestedDisplayTech);

if (needsDisplayTech.length > 0) {
  console.log('=== COINS NEEDING displayTech ===\n');
  needsDisplayTech.forEach((result, index) => {
    console.log(`${index + 1}. ${result.id}`);
    if (result.specificTech) {
      console.log(`   Specific Tech: ${result.specificTech}`);
    }
    console.log(`   Description: ${result.description}...`);
    console.log(`   Suggested displayTech: "${result.suggestedDisplayTech}"`);
    console.log('');
  });
}

// Output as code to copy-paste
if (needsDisplayTech.length > 0) {
  console.log('\n=== CODE TO ADD TO METADATA ===\n');
  console.log('// Add displayTech to these coins:\n');
  needsDisplayTech.forEach(result => {
    if (result.suggestedDisplayTech) {
      console.log(`  "${result.id}": {`);
      console.log(`    ...privacyMetadata["${result.id}"],`);
      console.log(`    displayTech: "${result.suggestedDisplayTech}",`);
      console.log(`  },`);
      console.log('');
    }
  });
}

// Show coins that couldn't be auto-labeled
if (withoutSuggestions.length > 0) {
  console.log('\n=== COINS NEEDING MANUAL REVIEW ===\n');
  withoutSuggestions.forEach((result, index) => {
    console.log(`${index + 1}. ${result.id}`);
    if (result.specificTech) {
      console.log(`   Specific Tech: ${result.specificTech}`);
    }
    console.log(`   Description: ${result.description}...`);
    console.log(`   → No automatic label found. Consider manual review.`);
    console.log('');
  });
}

export { generateDisplayTechLabels, extractDisplayTech };

