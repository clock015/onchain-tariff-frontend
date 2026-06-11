export const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmount = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(value);

export const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";
