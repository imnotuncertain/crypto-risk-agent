import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import { analyzeWallet } from "./index";
import { AnalyzeRequest } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || "3000");

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", agent: "Crypto Risk Analyzer", version: "1.0.0" });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ name: "Crypto Portfolio Risk Analyzer" });
});

app.post("/analyze", async (req: Request, res: Response) => {
  const { walletAddress, chainId = 1 }: AnalyzeRequest = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address." });
  }

  const supportedChains = [1, 56, 137];
  if (!supportedChains.includes(chainId)) {
    return res.status(400).json({ error: `Unsupported chainId: ${chainId}` });
  }

  const startTime = Date.now();
  try {
    const report = await analyzeWallet({ walletAddress, chainId });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    return res.json({ success: true, elapsed_seconds: parseFloat(elapsed), report });
  } catch (err: any) {
    return res.status(500).json({ error: "Analysis failed", message: err.message });
  }
});

app.post("/job", async (req: Request, res: Response) => {
  const { job_id, payload } = req.body;
  try {
    const { walletAddress, chainId = 1 } = payload as AnalyzeRequest;
    const report = await analyzeWallet({ walletAddress, chainId });
    return res.json({ job_id, status: "completed", result: report });
  } catch (err: any) {
    return res.status(500).json({ job_id, status: "failed", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Crypto Risk Analyzer Agent running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Analyze:      POST http://localhost:${PORT}/analyze`);
  console.log(`   ACP Jobs:     POST http://localhost:${PORT}/job`);
});
