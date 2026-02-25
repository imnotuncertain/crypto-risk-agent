// src/index.ts
// Orchestrator: takes a wallet address, runs all data fetches in parallel, returns RiskReport

import dotenv from "dotenv";
dotenv.config();

import { AnalyzeRequest, RiskReport, TokenHolding } from "./types";
import { getTokenHoldings, isContractVerified } from "./etherscan";
import { batchGetDexData } from "./dexscreener";
import { buildRiskReport } from "./analyzer";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  56: "BNB Smart Chain",
  137: "Polygon",
};

export async function analyzeWallet(req: AnalyzeRequest): Promise<RiskReport> {
  const { walletAddress, chainId = 1 } = req;
  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;

  console.log(`\n🔍 Analyzing wallet: ${walletAddress} on ${chainName}`);
  console.log(`  Step 1/4: Fetching token holdings from Etherscan...`);

  // Step 1: Get all token holdings
  const holdings: TokenHolding[] = await getTokenHoldings(walletAddress, chainId);
  console.log(`  → Found ${holdings.length} token(s)`);

  if (holdings.length === 0) {
    // Return a minimal report for empty wallets
    return {
      walletAddress,
      analyzedAt: new Date().toISOString(),
      chainId,
      chainName,
      totalTokensFound: 0,
      estimatedPortfolioUsd: 0,
      overallRiskScore: 0,
      riskLevel: "LOW",
      tokenRisks: [],
      flags: {
        concentrationRisk: false,
        rugPullRisk: false,
        lowLiquidityRisk: false,
        highVolatilityRisk: false,
      },
      summary: `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} has no ERC-20 token holdings.`,
      recommendations: ["No tokens found. Wallet may only hold native currency (ETH/BNB/MATIC)."],
    };
  }

  const contractAddresses = holdings.map((h) => h.contractAddress);

  // Step 2 & 3: Fetch DEX data and contract verification in parallel
  console.log(`  Step 2/4: Fetching DEX liquidity data from DexScreener...`);
  console.log(`  Step 3/4: Verifying contracts on Etherscan...`);

  const [dexDataMap, verifiedResults] = await Promise.all([
    batchGetDexData(contractAddresses, chainId),
    Promise.allSettled(
      contractAddresses.map((addr) => isContractVerified(addr, chainId))
    ),
  ]);

  // Build verified map
  const verifiedMap = new Map<string, boolean>();
  contractAddresses.forEach((addr, i) => {
    const result = verifiedResults[i];
    verifiedMap.set(addr, result.status === "fulfilled" ? result.value : false);
  });

  // Step 4: Estimate portfolio USD value using DexScreener prices
  console.log(`  Step 4/4: Building risk report...`);
  let estimatedPortfolioUsd = 0;
  for (const holding of holdings) {
    const dex = dexDataMap.get(holding.contractAddress);
    if (dex && dex.priceUsd > 0) {
      const rawBalance = parseFloat(holding.balance) / Math.pow(10, holding.decimals);
      holding.usdValue = rawBalance * dex.priceUsd;
      estimatedPortfolioUsd += holding.usdValue;
    }
  }

  // Build and return the report
  const report = await buildRiskReport(
    walletAddress,
    chainId,
    chainName,
    holdings,
    dexDataMap,
    verifiedMap,
    estimatedPortfolioUsd
  );

  console.log(`\n✅ Analysis complete — Risk Level: ${report.riskLevel} (${report.overallRiskScore}/100)`);
  return report;
}

// ── CLI mode: run directly with `ts-node src/index.ts <wallet> [chainId]` ──
if (require.main === module) {
  const wallet = process.argv[2];
  const chain = parseInt(process.argv[3] || "1");

  if (!wallet) {
    console.error("Usage: ts-node src/index.ts <walletAddress> [chainId]");
    console.error("Example: ts-node src/index.ts 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 1");
    process.exit(1);
  }

  analyzeWallet({ walletAddress: wallet, chainId: chain })
    .then((report) => {
      console.log("\n─────────────────────────────────────────");
      console.log("📊 RISK REPORT");
      console.log("─────────────────────────────────────────");
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
