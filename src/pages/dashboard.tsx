import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAccountPoints, useRightsData } from "@/hooks/useContractData";
import { useTaxRefundTransaction } from "@/hooks/useTaxRefundTransaction";
import { useEffect } from "react";
import { useAccount } from "wagmi";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: string) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
  }).format(toNumber(value));

const shortenAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const accountPoints = useAccountPoints(address);
  const rights = useRightsData({
    account: address,
  });
  const taxRefund = useTaxRefundTransaction();

  useEffect(() => {
    if (taxRefund.isSuccess) {
      void accountPoints.refetch();
      void rights.refetch();
    }
  }, [accountPoints, rights, taxRefund.isSuccess]);

  const buyerPoints = accountPoints.data.buyerPoints;
  const sellerPoints = accountPoints.data.sellerPoints;
  const refundable = Math.min(toNumber(buyerPoints), toNumber(sellerPoints));
  const buyerVotes = rights.data.buyerRights.votes;
  const sellerVotes = rights.data.sellerRights.votes;
  const totalVotes = toNumber(buyerVotes) + toNumber(sellerVotes);
  const buyerVotePercent =
    totalVotes > 0 ? (toNumber(buyerVotes) / totalVotes) * 100 : 0;
  const sellerVotePercent =
    totalVotes > 0 ? (toNumber(sellerVotes) / totalVotes) * 100 : 0;
  const isLoading = accountPoints.isLoading || rights.isLoading;
  const isError = accountPoints.isError || rights.isError;

  const handleClaimTaxRefund = () => {
    if (!address || refundable <= 0) {
      return;
    }

    taxRefund.claimTaxRefund(address);
  };

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的资产看板</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isConnected
              ? `当前账户：${address}`
              : "连接钱包后会读取链上积分和治理权重。"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void accountPoints.refetch();
            void rights.refetch();
          }}
          disabled={!isConnected || isLoading || taxRefund.isPending}
        >
          刷新数据
        </Button>
      </div>

      {isError && (
        <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          合约数据读取失败，请确认当前钱包网络和合约部署地址一致。
        </div>
      )}

      {taxRefund.error && (
        <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          退税交易失败：{taxRefund.error.message}
        </div>
      )}

      {taxRefund.isSuccess && (
        <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          退税交易已确认，数据正在刷新。
        </div>
      )}

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">买方积分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isLoading ? "读取中..." : `${formatAmount(buyerPoints)} USDC`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">卖方积分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isLoading ? "读取中..." : `${formatAmount(sellerPoints)} USDC`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-600/10">
          <CardHeader>
            <CardTitle className="text-sm text-blue-400">可退税额度</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {isLoading ? "读取中..." : `${formatAmount(String(refundable))} USDC`}
            </p>
            <Button
              className="mt-4 w-full bg-blue-600"
              onClick={handleClaimTaxRefund}
              disabled={
                !isConnected ||
                !address ||
                refundable <= 0 ||
                isLoading ||
                taxRefund.isPending
              }
            >
              {taxRefund.isPending ? "退税处理中..." : "一键对冲退税"}
            </Button>
            {taxRefund.hash && (
              <p className="mt-3 break-all text-xs text-zinc-500">
                交易哈希：{taxRefund.hash}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>买方治理权</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-400">Buyer Rights 投票权重</span>
                <span className="font-mono text-blue-400">
                  {isLoading ? "读取中..." : formatAmount(buyerVotes)}
                </span>
              </div>
              <Progress
                value={buyerVotePercent}
                className="h-2 bg-zinc-800"
                indicatorClassName="bg-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">当前轮次</p>
                <p className="font-mono">
                  {rights.data.buyerRights.currentRoundId.toString()}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Clock</p>
                <p className="font-mono">
                  {rights.data.buyerRights.clock.toString()}
                </p>
              </div>
            </div>
            <p className="break-all text-xs text-zinc-500">
              Token：{shortenAddress(rights.data.buyerRightsAddress)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>卖方治理权</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-400">Seller Rights 投票权重</span>
                <span className="font-mono text-purple-400">
                  {isLoading ? "读取中..." : formatAmount(sellerVotes)}
                </span>
              </div>
              <Progress
                value={sellerVotePercent}
                className="h-2 bg-zinc-800"
                indicatorClassName="bg-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">当前轮次</p>
                <p className="font-mono">
                  {rights.data.sellerRights.currentRoundId.toString()}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Clock</p>
                <p className="font-mono">
                  {rights.data.sellerRights.clock.toString()}
                </p>
              </div>
            </div>
            <p className="break-all text-xs text-zinc-500">
              Token：{shortenAddress(rights.data.sellerRightsAddress)}
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
