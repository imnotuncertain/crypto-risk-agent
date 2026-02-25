# 🔐 Crypto Portfolio Risk Analyzer Agent

An on-chain portfolio risk analyzer built for the [Virtuals ACP marketplace](https://agdp.io). Analyzes any EVM wallet and returns a full risk report — other agents pay per scan.

## What it checks

- **Token concentration risk** — flags if >50% of portfolio is one asset
- **Contract verification** — checks if each token's source code is verified on Etherscan
- **DEX liquidity** — pulls live liquidity data from DexScreener
- **Liquidity lock detection** — heuristic detection of unlocked liquidity
- **Price volatility** — flags tokens with >30% 24h price swings
- **Overall risk score** — 0–100 composite score with LOW / MEDIUM / HIGH / CRITICAL levels

---

## Quick Start

### 1. Clone and install
```bash
git clone <your-repo-url> crypto-risk-agent
cd crypto-risk-agent
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Get a free Etherscan API key at: https://etherscan.io/myapikey

### 3. Run in development
```bash
# Start the HTTP server
npm run serve

# Or test a single wallet via CLI
npx ts-node src/index.ts 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 1
```

### 4. Test the API
```bash
# Health check
curl http://localhost:3000/health

# Analyze a wallet
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chainId": 1}'
```

---

## Deploying to Virtuals ACP (agdp.io)

### Step 1: Register your agent
1. Go to https://app.virtuals.io/acp/join
2. Register a new agent — you'll get an `AGENT_WALLET_ADDRESS`
3. Whitelist your EOA wallet — you'll get a `SESSION_ENTITY_KEY_ID`
4. Fund the agent wallet with USDC

### Step 2: Deploy the server
Deploy to any cloud provider. The server needs a public HTTPS URL.

```bash
# Example: Deploy to Railway
railway init
railway up

# Example: Deploy to Render
# Connect your GitHub repo to Render
# Set build command: npm install && npm run build
# Set start command: npm start
```

### Step 3: Register your service on ACP
In your ACP dashboard, register a new service offering:
- **Service name**: Crypto Portfolio Risk Analyzer
- **Description**: Full on-chain risk report for any EVM wallet
- **Endpoint**: https://your-deployed-url.com/job
- **Price**: 0.5 USDC per job
- **Input schema**: `{ walletAddress: string, chainId?: number }`

### Step 4: Add credentials to .env
```env
AGENT_WALLET_ADDRESS=0x...
SESSION_ENTITY_KEY_ID=1
WALLET_PRIVATE_KEY=0x...
```

---

## Project Structure

```
crypto-risk-agent/
├── src/
│   ├── index.ts        # Orchestrator (main logic)
│   ├── server.ts       # HTTP server + ACP job handler
│   ├── analyzer.ts     # Risk scoring engine
│   ├── etherscan.ts    # Etherscan API client
│   ├── dexscreener.ts  # DexScreener API client
│   └── types.ts        # TypeScript types
├── SKILL.md            # ACP skill documentation
├── .env.example        # Environment template
├── package.json
└── tsconfig.json
```

---

## Revenue Model

Each wallet analysis = 1 ACP job = 0.5 USDC. 

If trading agents call this before each trade and you have 10 active clients doing 50 trades/day:
- 10 × 50 × $0.50 = **$250/day** passively

---

## Supported Chains

| Chain | Chain ID | Required Env Key |
|-------|----------|-----------------|
| Ethereum | 1 | `ETHERSCAN_API_KEY` |
| BNB Chain | 56 | `BSCSCAN_API_KEY` |
| Polygon | 137 | `POLYGONSCAN_API_KEY` |

---

## Roadmap

- [ ] DefiLlama integration for DeFi protocol risk
- [ ] Whale wallet correlation (detect wallet follows known insiders)
- [ ] Token holder distribution analysis (honeypot detection)
- [ ] Historical risk trend tracking
- [ ] Support for Arbitrum, Base, Optimism
