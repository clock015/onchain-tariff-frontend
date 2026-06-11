import { type Address, formatUnits, parseUnits } from "viem";
import { TOKEN_DECIMALS, ZERO_ADDRESS } from "./config";

export const readBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && value) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
};

export const readAddress = (value: unknown) =>
  typeof value === "string" && value.startsWith("0x")
    ? (value as Address)
    : undefined;

export const formatTokenAmount = (value: unknown, decimals: number) =>
  formatUnits(readBigInt(value), decimals);

export const hasRealAddress = (address?: Address) =>
  Boolean(address) && address !== ZERO_ADDRESS;

export const parseTokenAmount = (amount: string) => {
  try {
    return parseUnits(amount || "0", TOKEN_DECIMALS);
  } catch {
    return 0n;
  }
};
