# Crypto Portfolio Risk Analyzer

## What this agent does

Analyzes any EVM-compatible wallet address and returns a comprehensive on-chain risk report. Useful for:
- Checking if a wallet holds rug-pull-prone tokens before copying trades
- Scoring counterparty risk before entering a DeFi deal
- Portfolio risk management and diversification analysis

## Input

Send a POST request to `/analyze` with:

```json
{
  "walletAddress": "0x...",
  "chainId": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `walletAddress` | string | ✅ | Any EVM wallet address |
| `chainId` | number | ❌ | 1 = Ethereum (default), 56 = BSC, 137 = Polygon |

## Output

Returns a `RiskReport` with:

```json
{
  "walletAddress": "0x...",
  "overallRiskScore": 65,
  "riskLevel": "HIGH",
  "totalTokensFound": 8,
  "estimatedPortfolioUsd": 12400.50,
  "flags": {
    "concentrationRisk": true,
    "rugPullRisk": false,
    "lowLiquidityRisk": true,
    "highVolatilityRisk": true
  },
  "tokenRisks": [
    {
      "symbol": "SCAMTOKEN",
      "riskScore": 85,
      "portfolioPercentage": 62.3,
      "liquidityUsd": 8200,
      "isContractVerified": false,
      "hasLiquidityLock": false,
      "flags": [
        "🚨 Contract source not verified on Etherscan",
        "⚠️ Low liquidity: $8,200",
        "⚠️ High concentration: 62.3% of portfolio"
      ]
    }
  ],
  "summary": "Wallet 0xd8dA...6045 has a HIGH risk profile (score: 65/100)...",
  "recommendations": [
    "Consider reducing or exiting high-risk positions: SCAMTOKEN",
    "1 token(s) have unverified contracts — research thoroughly before holding"
  ]
}
```

## Risk Score Levels

| Score | Level | Meaning |
|-------|-------|---------|
| 0–29 | LOW | Relatively safe portfolio |
| 30–49 | MEDIUM | Some risk present, monitor closely |
| 50–69 | HIGH | Significant risk factors detected |
| 70–100 | CRITICAL | Immediate attention recommended |

## Pricing

0.5 USDC per analysis (paid via ACP escrow on Virtuals Protocol)

## Data Sources

- Etherscan / BSCScan / PolygonScan (contract verification, token balances)
- DexScreener (liquidity, price, volume data)
- DefiLlama (protocol TVL — coming soon)
