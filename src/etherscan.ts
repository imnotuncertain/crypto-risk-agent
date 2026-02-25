// src/etherscan.ts
import axios from "axios";
import { TokenHolding } from "./types";

const V2_BASE = "https://api.etherscan.io/v2/api";

function getApiKey(): string {
  return process.env.ETHERSCAN_API_KEY || "";
}

export async function getTokenHoldings(
  walletAddress: string,
  chainId: number = 1
): Promise<TokenHolding[]> {
  try {
    const response = await axios.get(V2_BASE, {
      params: {
        chainid: chainId,
        module: "account",
        action: "tokentx",
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        sort: "desc",
        apikey: getApiKey(),
      },
      timeout: 10000,
    });

    if (response.data.status !== "1" || !response.data.result) {
      console.log("Etherscan response:", response.data.message);
      return [];
    }

    const tokenMap = new Map<string, TokenHolding>();
    for (const tx of response.data.result) {
      const addr = tx.contractAddress.toLowerCase();
      if (!tokenMap.has(addr)) {
        tokenMap.set(addr, {
          contractAddress: addr,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          balance: "0",
          decimals: parseInt(tx.tokenDecimal) || 18,
        });
      }
    }

    const tokens = Array.from(tokenMap.values()).slice(0, 20);
    const balancePromises = tokens.map((token) =>
      getTokenBalance(walletAddress, token.contractAddress, chainId)
    );
    const balances = await Promise.allSettled(balancePromises);

    return tokens
      .map((token, i) => {
        const result = balances[i];
        if (result.status === "fulfilled") {
          token.balance = result.value;
        }
        return token;
      })
      .filter((t) => t.balance !== "0" && t.balance !== "");
  } catch (err) {
    console.error("Etherscan token holdings error:", err);
    return [];
  }
}

export async function getTokenBalance(
  walletAddress: string,
  contractAddress: string,
  chainId: number = 1
): Promise<string> {
  try {
    const response = await axios.get(V2_BASE, {
      params: {
        chainid: chainId,
        module: "account",
        action: "tokenbalance",
        contractaddress: contractAddress,
        address: walletAddress,
        tag: "latest",
        apikey: getApiKey(),
      },
      timeout: 5000,
    });
    return response.data.result || "0";
  } catch {
    return "0";
  }
}

export async function isContractVerified(
  contractAddress: string,
  chainId: number = 1
): Promise<boolean> {
  try {
    const response = await axios.get(V2_BASE, {
      params: {
        chainid: chainId,
        module: "contract",
        action: "getsourcecode",
        address: contractAddress,
        apikey: getApiKey(),
      },
      timeout: 5000,
    });
    const result = response.data.result?.[0];
    return !!(result?.SourceCode && result.SourceCode.length > 0);
  } catch {
    return false;
  }
}

export async function getEthBalance(
  walletAddress: string,
  chainId: number = 1
): Promise<string> {
  try {
    const response = await axios.get(V2_BASE, {
      params: {
        chainid: chainId,
        module: "account",
        action: "balance",
        address: walletAddress,
        tag: "latest",
        apikey: getApiKey(),
      },
      timeout: 5000,
    });
    return response.data.result || "0";
  } catch {
    return "0";
  }
}
