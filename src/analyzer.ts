// src/analyzer.ts
// Core risk scoring logic - takes wallet data and produces a RiskReport

import { TokenHolding, TokenRisk, RiskReport } from "./types";
import { DexTokenData } from "./dexscreener";
import { isContractVerified } from "./etherscan";

// Score a single token's risk (0 = safe, 100 = extremely risky)
function scoreTokenRisk(
  holding: TokenHolding,
  portfolioPercent: number,
  dexData: DexTokenData | null,
  isVerified: boolean
): TokenRisk {
  let riskScore = 0;
  const flags: string[] = [];

  // ── Contract verification ─────────────────────────────────
  if (!isVerified) {
    riskScore += 30;
    flags.push("⚠️ Contract source not verified on Etherscan");
  }

  // ── Liquidity checks ──────────────────────────────────────
  if (!dexData) {
    riskScore += 25;
    flags.push("⚠️ No DEX liquidity data found — token may be unlisted or illiquid");
  } else {
    if (dexData.liquidityUsd < 10_000) {
      riskScore += 35;
      flags.push(`🚨 Critically low liquidity: $${dexData.liquidityUsd.toFixed(0)}`);
    } else if (dexData.liquidityUsd < 50_000) {
      riskScore += 20;
      flags.push(`⚠️ Low liquidity: $${dexData.liquidityUsd.toFixed(0)}`);
    } else if (dexData.liquidityUsd < 500_000) {
      riskScore += 5;
    }

    if (!dexData.hasLiquidityLock) {
      riskScore += 15;
      flags.push("⚠️ Liquidity lock not detected — rug pull risk elevated");
    }

    if (Math.abs(dexData.priceChange24h) > 30) {
      riskScore += 10;
      flags.push(`📉 High 24h price change: ${dexData.priceChange24h.toFixed(1)}%`);
    }
  }

  // ── Concentration risk ────────────────────────────────────
  if (portfolioPercent > 70) {
    riskScore += 20;
    flags.push(`🚨 Extreme concentration: ${portfolioPercent.toFixed(1)}% of portfolio`);
  } else if (portfolioPercent > 50) {
    riskScore += 10;
    flags.push(`⚠️ High concentration: ${portfolioPercent.toFixed(1)}% of portfolio`);
  }

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  return {
    symbol: holding.tokenSymbol,
    contractAddress: holding.contractAddress,
    portfolioPercentage: portfolioPercent,
    liquidityUsd: dexData?.liquidityUsd || 0,
    isContractVerified: isVerified,
    hasLiquidityLock: dexData?.hasLiquidityLock || false,
    riskScore,
    flags,
  };
}

// Generate recommendations from the overall report
function buildRecommendations(tokenRisks: TokenRisk[], overallScore: number): string[] {
  const recs: string[] = [];

  const highRisk = tokenRisks.filter((t) => t.riskScore >= 70);
  const unverified = tokenRisks.filter((t) => !t.isContractVerified);
  const lowLiquidity = tokenRisks.filter((t) => t.liquidityUsd < 50_000 && t.liquidityUsd > 0);
  const concentrated = tokenRisks.filter((t) => t.portfolioPercentage > 50);

  if (highRisk.length > 0) {
    recs.push(
      `Consider reducing or exiting high-risk positions: ${highRisk.map((t) => t.symbol).join(", ")}`
    );
  }

  if (unverified.length > 0) {
    recs.push(
      `${unverified.length} token(s) have unverified contracts — research thoroughly before holding: ${unverified.map((t) => t.symbol).join(", ")}`
    );
  }

  if (lowLiquidity.length > 0) {
    recs.push(
      `Low liquidity tokens may be hard to exit quickly: ${lowLiquidity.map((t) => t.symbol).join(", ")}`
    );
  }

  if (concentrated.length > 0) {
    recs.push(
      `Portfolio is highly concentrated in ${concentrated[0].symbol} (${concentrated[0].portfolioPercentage.toFixed(0)}%) — consider diversifying`
    );
  }

  if (overallScore < 30) {
    recs.push("Portfolio looks relatively safe. Continue monitoring liquidity and market conditions.");
  }

  return recs;
}

// Build the overall summary string
function buildSummary(
  walletAddress: string,
  riskLevel: string,
  overallScore: number,
  tokenRisks: TokenRisk[]
): string {
  const topRisk = [...tokenRisks].sort((a, b) => b.riskScore - a.riskScore)[0];
  return (
    `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} has a ` +
    `${riskLevel} risk profile (score: ${overallScore}/100) across ${tokenRisks.length} token(s). ` +
    (topRisk
      ? `Highest risk token: ${topRisk.symbol} (${topRisk.riskScore}/100). `
      : "") +
    `Analysis powered by Crypto Risk Analyzer Agent on Virtuals ACP.`
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function buildRiskReport(
  walletAddress: string,
  chainId: number,
  chainName: string,
  holdings: TokenHolding[],
  dexDataMap: Map<string, DexTokenData | null>,
  verifiedMap: Map<string, boolean>,
  estimatedPortfolioUsd: number
): Promise<RiskReport> {
  // Build per-token risks
  const tokenRisks: TokenRisk[] = holdings.map((holding) => {
    const portfolioPercent =
      estimatedPortfolioUsd > 0 && holding.usdValue
        ? (holding.usdValue / estimatedPortfolioUsd) * 100
        : 100 / holdings.length; // fallback: equal weight

    const dexData = dexDataMap.get(holding.contractAddress) || null;
    const isVerified = verifiedMap.get(holding.contractAddress) || false;

    return scoreTokenRisk(holding, portfolioPercent, dexData, isVerified);
  });

  // Sort by risk score descending
  tokenRisks.sort((a, b) => b.riskScore - a.riskScore);

  // Compute overall risk score (weighted average, with max token score having 40% weight)
  const avgScore =
    tokenRisks.length > 0
      ? tokenRisks.reduce((sum, t) => sum + t.riskScore, 0) / tokenRisks.length
      : 0;
  const maxScore = tokenRisks[0]?.riskScore || 0;
  const overallRiskScore = Math.round(avgScore * 0.6 + maxScore * 0.4);

  // Risk level
  let riskLevel: RiskReport["riskLevel"];
  if (overallRiskScore >= 70) riskLevel = "CRITICAL";
  else if (overallRiskScore >= 50) riskLevel = "HIGH";
  else if (overallRiskScore >= 30) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  // Top-level flags
  const concentrationRisk = tokenRisks.some((t) => t.portfolioPercentage > 50);
  const rugPullRisk = tokenRisks.some((t) => !t.isContractVerified && !t.hasLiquidityLock);
  const lowLiquidityRisk = tokenRisks.some((t) => t.liquidityUsd > 0 && t.liquidityUsd < 50_000);
  const highVolatilityRisk = tokenRisks.some((t) => t.portfolioPercentage > 30 && t.riskScore > 50);

  const recommendations = buildRecommendations(tokenRisks, overallRiskScore);
  const summary = buildSummary(walletAddress, riskLevel, overallRiskScore, tokenRisks);

  return {
    walletAddress,
    analyzedAt: new Date().toISOString(),
    chainId,
    chainName,
    totalTokensFound: holdings.length,
    estimatedPortfolioUsd,
    overallRiskScore,
    riskLevel,
    tokenRisks,
    flags: {
      concentrationRisk,
      rugPullRisk,
      lowLiquidityRisk,
      highVolatilityRisk,
    },
    summary,
    recommendations,
  };
}
