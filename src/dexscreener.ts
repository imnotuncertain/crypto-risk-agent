// src/dexscreener.ts
// Fetches token liquidity, price, and market data from DexScreener (free, no API key needed)

import axios from "axios";

export interface DexTokenData {
  symbol: string;
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volume24h: number;
  priceChange24h: number;
  hasLiquidityLock: boolean; // heuristic based on liquidity stability
  dexUrl: string;
}

const DEX_BASE = "https://api.dexscreener.com/latest/dex";

// Chain name mapping for DexScreener
const CHAIN_MAP: Record<number, string> = {
  1: "ethereum",
  56: "bsc",
  137: "polygon",
};

export async function getTokenDexData(
  contractAddress: string,
  chainId: number = 1
): Promise<DexTokenData | null> {
  const chain = CHAIN_MAP[chainId] || "ethereum";

  try {
    const response = await axios.get(
      `${DEX_BASE}/tokens/${contractAddress}`,
      { timeout: 8000 }
    );

    const pairs = response.data?.pairs;
    if (!pairs || pairs.length === 0) return null;

    // Find the pair on the right chain with most liquidity
    const relevantPairs = pairs
      .filter((p: any) => p.chainId === chain)
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    if (relevantPairs.length === 0) return null;

    const best = relevantPairs[0];
    const liquidityUsd = best.liquidity?.usd || 0;

    // Heuristic: if liquidity is consistently present and > $100k, assume some form of lock
    // Real lock detection would require checking team.finance / unicrypt APIs
    const hasLiquidityLock = liquidityUsd > 100_000;

    return {
      symbol: best.baseToken?.symbol || "",
      priceUsd: parseFloat(best.priceUsd || "0"),
      liquidityUsd,
      marketCapUsd: best.marketCap || 0,
      volume24h: best.volume?.h24 || 0,
      priceChange24h: best.priceChange?.h24 || 0,
      hasLiquidityLock,
      dexUrl: best.url || "",
    };
  } catch (err) {
    return null;
  }
}

// Batch fetch token data (with small delay to avoid rate limits)
export async function batchGetDexData(
  contracts: string[],
  chainId: number = 1
): Promise<Map<string, DexTokenData | null>> {
  const results = new Map<string, DexTokenData | null>();

  for (const addr of contracts) {
    const data = await getTokenDexData(addr, chainId);
    results.set(addr.toLowerCase(), data);
    // Small delay to be polite to the free API
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}
