import type { PrivacyTechnology } from "./privacyMetadata";

export const TECH_DESCRIPTIONS: Record<PrivacyTechnology, string> = {
  "zk-SNARKs": "Zero-knowledge proofs that allow transaction validation without revealing sender, recipient, or amount. Provides mathematical guarantees of privacy.",
  "Ring Signatures": "Cryptographic mixing that obscures the sender by grouping transactions together. Makes it computationally infeasible to determine the actual sender.",
  "Mimblewimble": "Confidential transactions that hide amounts using homomorphic encryption. Allows verification without revealing transaction details.",
  "CoinJoin": "Transaction mixing protocol that combines multiple payments into a single transaction. Increases privacy through obfuscation of transaction flow.",
  "TEE": "Trusted Execution Environments provide hardware-level privacy for smart contracts. Uses secure enclaves to protect computation.",
  "Mixnet": "Network-level mixing that routes transactions through multiple nodes. Provides strong anonymity by breaking linkability between sender and recipient.",
  "MPC": "Multi-Party Computation allows private computation across multiple parties. Enables collaborative computation without revealing individual inputs.",
  "Other": "Alternative privacy technologies not fitting standard categories. May include novel approaches or combinations of multiple techniques.",
  "Unknown": "Privacy technology classification pending research. Coin requires manual review to determine underlying privacy mechanism.",
};

