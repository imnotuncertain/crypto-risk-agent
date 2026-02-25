// src/types.ts

export interface TokenHolding {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: string;
  decimals: number;
  usdValue?: number;
}

export interface RiskFlags {
  highConcentration: boolean;       // >50% in one asset
  noLiquidityLock: boolean;         // token liquidity not locked
  lowLiquidity: boolean;            // < $50k liquidity
  unverifiedContract: boolean;      // contract not verified on Etherscan
  highVolatilityExposure: boolean;  // >80% in volatile assets
}

export interface TokenRisk {
  symbol: string;
  contractAddress: string;
  portfolioPercentage: number;
  liquidityUsd: number;
  isContractVerified: boolean;
  hasLiquidityLock: boolean;
  riskScore: number; // 0-100, higher = riskier
  flags: string[];
}

export interface RiskReport {
  walletAddress: string;
  analyzedAt: string;
  chainId: number;
  chainName: string;

  // Portfolio summary
  totalTokensFound: number;
  estimatedPortfolioUsd: number;

  // Risk breakdown
  overallRiskScore: number;         // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  // Individual token risks
  tokenRisks: TokenRisk[];

  // Top-level flags
  flags: {
    concentrationRisk: boolean;
    rugPullRisk: boolean;
    lowLiquidityRisk: boolean;
    highVolatilityRisk: boolean;
  };

  // Human-readable summary
  summary: string;
  recommendations: string[];
}

export interface AnalyzeRequest {
  walletAddress: string;
  chainId?: number; // default: 1 (Ethereum mainnet)
}
