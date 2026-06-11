export type ProposalActionArgs = {
  target: `0x${string}`;
  value: bigint;
  calldata: `0x${string}`;
  descriptionHash: `0x${string}`;
};

export const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmount = (value: string) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(toNumber(value));

export const parseBigIntInput = (value: string) => {
  try {
    return BigInt(value || "0");
  } catch {
    return undefined;
  }
};

export const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

export const shortenId = (value: bigint) => {
  const text = value.toString();
  return text.length > 18 ? `${text.slice(0, 10)}...${text.slice(-8)}` : text;
};

export const statusClassName = (status: string) => {
  if (status === "Active") {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (status === "Succeeded" || status === "Executed") {
    return "bg-green-500/10 text-green-400 border-green-500/20";
  }
  if (status === "Queued") {
    return "bg-purple-500/10 text-purple-300 border-purple-500/20";
  }
  if (status === "Defeated" || status === "Canceled" || status === "Expired") {
    return "bg-red-500/10 text-red-300 border-red-500/20";
  }
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
};
