import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClaimedAmount, useMerchants } from "@/hooks/useContractData";
import { useMerchantRegistration } from "@/hooks/useMerchantRegistration";
import { useTradeTransaction } from "@/hooks/useTradeTransaction";
import { Plus, X } from "lucide-react";
import { type Address, type Hex, isAddress, isHex } from "viem";
import { useAccount } from "wagmi";
import { useEffect, useMemo, useState } from "react";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(value);

const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

export default function HomePage() {
  const { address: account, isConnected } = useAccount();
  const [merchantInput, setMerchantInput] = useState("");
  const [amount, setAmount] = useState("");
  const [tradeDataInput, setTradeDataInput] = useState("");
  const [isCreateMerchantOpen, setIsCreateMerchantOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [interactionTargetInput, setInteractionTargetInput] = useState("");

  const merchantAddress = useMemo(() => {
    const value = merchantInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [merchantInput]);

  const interactionTarget = useMemo(() => {
    const value = interactionTargetInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [interactionTargetInput]);

  const tradeData = useMemo(() => {
    const value = tradeDataInput.trim();
    if (!value) return "0x" as Hex;
    return isHex(value) ? (value as Hex) : undefined;
  }, [tradeDataInput]);

  const merchantQuery = useMerchants(merchantAddress ? [merchantAddress] : []);
  const claimedQuery = useClaimedAmount(merchantAddress);
  const merchant = merchantQuery.data[0];
  const trade = useTradeTransaction({
    account,
    amount,
  });
  const merchantRegistration = useMerchantRegistration({
    account,
    depositAmount,
  });

  const parsedAmount = toNumber(amount);
  const depositIsValid = toNumber(depositAmount) > 0;
  const merchantProceeds = parsedAmount * 0.9;
  const taxPoints = parsedAmount * 0.09;
  const governanceRights = parsedAmount * 0.01;
  const dataIsValid = tradeData !== undefined;

  const canAct =
    Boolean(account) &&
    Boolean(merchantAddress) &&
    dataIsValid &&
    parsedAmount > 0 &&
    Boolean(merchant?.active) &&
    !trade.isPending &&
    !trade.isReadingAllowance;

  const canCreateMerchant =
    Boolean(account) &&
    Boolean(interactionTarget) &&
    depositIsValid &&
    !merchantRegistration.isPending &&
    !merchantRegistration.isReadingAllowance;

  useEffect(() => {
    if (!merchantRegistration.isRegisterSuccess || !account) {
      return;
    }

    setMerchantInput(account);
    setIsCreateMerchantOpen(false);
  }, [account, merchantRegistration.isRegisterSuccess]);

  const handlePrimaryAction = () => {
    if (!account || !merchantAddress || !tradeData || parsedAmount <= 0) {
      return;
    }

    if (trade.needsApproval) {
      trade.approve();
      return;
    }

    trade.sendTrade({
      buyer: account,
      merchant: merchantAddress,
      data: tradeData,
    });
  };

  const handleOpenCreateMerchant = () => {
    setInteractionTargetInput(account ?? "");
    setIsCreateMerchantOpen(true);
  };

  const handleCreateMerchant = () => {
    if (!interactionTarget || !depositIsValid) {
      return;
    }

    if (merchantRegistration.needsApproval) {
      merchantRegistration.approve();
      return;
    }

    merchantRegistration.registerMerchant(interactionTarget);
  };

  const buttonText = (() => {
    if (trade.isApproving) return "授权确认中...";
    if (trade.isTrading) return "交易处理中...";
    if (trade.isReadingAllowance) return "读取授权额度...";
    if (trade.needsApproval) return "授权 USDC";
    return "执行原子交易";
  })();

  const createMerchantButtonText = (() => {
    if (merchantRegistration.isApproving) return "授权确认中...";
    if (merchantRegistration.isRegistering) return "注册处理中...";
    if (merchantRegistration.isReadingAllowance) return "读取授权额度...";
    if (merchantRegistration.needsApproval) return "授权押金";
    return "创建商家";
  })();

  return (
    <Layout>
      <section className="mb-10 py-8">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          去中心化 <span className="text-blue-500">10%-9%-1%</span> 交易协议
        </h1>
        <p className="max-w-2xl text-zinc-400">
          输入商家地址、支付金额和可选 data，页面会读取链上商家信息、历史 claimed
          数据，并在交易前自动检查 USDC 授权额度。
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">商家信息</h2>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleOpenCreateMerchant}
              disabled={!isConnected}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              创建商家
            </Button>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">
                当前查询商家
              </CardTitle>
              <CardDescription>
                输入地址后会读取商家注册信息和该地址的历史 claimed 数值。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!merchantInput.trim() && (
                <p className="text-sm text-zinc-500">
                  请输入一个商家地址开始查询。
                </p>
              )}

              {merchantInput.trim() && !merchantAddress && (
                <p className="text-sm text-red-300">商家地址格式不正确。</p>
              )}

              {merchantAddress &&
                (merchantQuery.isLoading || claimedQuery.isLoading) && (
                  <p className="text-sm text-zinc-500">
                    正在读取链上商家和历史 claimed 数据...
                  </p>
                )}

              {merchantAddress &&
                (merchantQuery.isError || claimedQuery.isError) && (
                  <p className="text-sm text-red-300">
                    链上数据读取失败，请确认钱包网络和合约地址。
                  </p>
                )}

              {merchantAddress && merchant && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500">商家地址</p>
                    <p className="break-all font-mono text-sm text-blue-400">
                      {merchant.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">状态</p>
                      <p
                        className={
                          merchant.active
                            ? "font-semibold text-green-400"
                            : "font-semibold text-red-300"
                        }
                      >
                        {merchant.active ? "已激活" : "未激活"}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">保证金</p>
                      <p className="font-mono">{merchant.deposit} USDC</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">历史已退税</p>
                      <p className="font-mono">{claimedQuery.data} USDC</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">交互地址</p>
                    <p className="break-all font-mono text-sm">
                      {merchant.interactionTarget}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-24">
          <Card className="bg-zinc-900 border-blue-500/30 border-2 shadow-2xl shadow-blue-500/10">
            <CardHeader>
              <CardTitle>发起交易</CardTitle>
              <CardDescription>
                当前钱包：{isConnected ? shortenAddress(account) : "未连接"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase text-zinc-400">
                  商家地址
                </label>
                <Input
                  placeholder="0x..."
                  value={merchantInput}
                  onChange={(event) => setMerchantInput(event.target.value)}
                  className="bg-zinc-950 border-zinc-800 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase text-zinc-400">
                  支付金额 (USDC)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase text-zinc-400">
                  可选 data (bytes)
                </label>
                <Input
                  placeholder="0x"
                  value={tradeDataInput}
                  onChange={(event) => setTradeDataInput(event.target.value)}
                  className="bg-zinc-950 border-zinc-800 font-mono"
                />
                {!dataIsValid && (
                  <p className="text-xs text-red-300">
                    data 必须是 hex bytes，例如 0x 或 0x1234。
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">商家所得 (90%)</span>
                  <span className="font-mono text-green-400">
                    +{formatAmount(merchantProceeds)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">退税积分 (9%)</span>
                  <span className="font-mono text-blue-400">
                    +{formatAmount(taxPoints)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">治理确权 (1%)</span>
                  <span className="font-mono text-purple-400">
                    +{formatAmount(governanceRights)} USDC
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-500">
                <p>Underlying：{shortenAddress(trade.underlyingAddress)}</p>
                <p>
                  当前流程：
                  {trade.needsApproval ? "需要先授权 USDC" : "授权额度足够"}
                </p>
                <p>发送 data：{tradeData ?? "-"}</p>
              </div>

              {trade.approveHash && (
                <p className="break-all text-xs text-zinc-500">
                  授权交易：{trade.approveHash}
                </p>
              )}

              {trade.tradeHash && (
                <p className="break-all text-xs text-zinc-500">
                  交易哈希：{trade.tradeHash}
                </p>
              )}

              {trade.error && (
                <p className="text-sm text-red-300">
                  操作失败：{trade.error.message}
                </p>
              )}

              {trade.isApproveSuccess && trade.needsApproval && (
                <p className="text-sm text-green-400">
                  授权已确认，正在刷新 allowance...
                </p>
              )}

              {trade.isTradeSuccess && (
                <p className="text-sm text-green-400">交易已确认。</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handlePrimaryAction}
                disabled={!canAct}
              >
                {buttonText}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {isCreateMerchantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-md border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">创建商家</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  调用 Market.registerMerchant(amount, interactionTarget)。
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={() => setIsCreateMerchantOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                <p>当前钱包</p>
                <p className="break-all font-mono text-zinc-200">
                  {account ?? "未连接"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase text-zinc-400">
                  押金金额 (USDC)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  className="bg-zinc-950 border-zinc-800"
                />
                {!depositIsValid && (
                  <p className="text-xs text-red-300">押金金额必须大于 0。</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase text-zinc-400">
                  Interaction Target
                </label>
                <Input
                  placeholder="0x..."
                  value={interactionTargetInput}
                  onChange={(event) =>
                    setInteractionTargetInput(event.target.value)
                  }
                  className="bg-zinc-950 border-zinc-800 font-mono"
                />
                {interactionTargetInput.trim() && !interactionTarget && (
                  <p className="text-xs text-red-300">
                    interactionTarget 地址格式不正确。
                  </p>
                )}
              </div>

              <div className="space-y-1 text-xs text-zinc-500">
                <p>
                  Underlying：
                  {shortenAddress(merchantRegistration.underlyingAddress)}
                </p>
                <p>
                  当前流程：
                  {merchantRegistration.needsApproval
                    ? "需要先授权押金"
                    : "授权额度足够"}
                </p>
              </div>

              {merchantRegistration.approveHash && (
                <p className="break-all text-xs text-zinc-500">
                  授权交易：{merchantRegistration.approveHash}
                </p>
              )}

              {merchantRegistration.registerHash && (
                <p className="break-all text-xs text-zinc-500">
                  注册交易：{merchantRegistration.registerHash}
                </p>
              )}

              {merchantRegistration.error && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  创建失败：{merchantRegistration.error.message}
                </p>
              )}

              {merchantRegistration.isApproveSuccess &&
                merchantRegistration.needsApproval && (
                  <p className="text-sm text-green-400">
                    授权已确认，正在刷新 allowance...
                  </p>
                )}

              {merchantRegistration.isRegisterSuccess && (
                <p className="text-sm text-green-400">商家已创建。</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-800 px-5 py-4">
              <Button
                variant="outline"
                className="border-zinc-700"
                onClick={() => setIsCreateMerchantOpen(false)}
              >
                取消
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateMerchant}
                disabled={!canCreateMerchant}
              >
                {createMerchantButtonText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
