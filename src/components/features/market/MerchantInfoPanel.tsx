import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type ContractMerchant } from "@/hooks/useContractData";
import { Plus } from "lucide-react";
import { type Address } from "viem";

type MerchantInfoPanelProps = {
  merchantInput: string;
  merchantAddress?: Address;
  merchant?: ContractMerchant;
  claimedAmount: string;
  isConnected: boolean;
  isLoading: boolean;
  isError: boolean;
  onOpenCreateMerchant: () => void;
};

export function MerchantInfoPanel({
  merchantInput,
  merchantAddress,
  merchant,
  claimedAmount,
  isConnected,
  isLoading,
  isError,
  onOpenCreateMerchant,
}: MerchantInfoPanelProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">商家信息</h2>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onOpenCreateMerchant}
          disabled={!isConnected}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          创建商家
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">当前查询商家</CardTitle>
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

          {merchantAddress && isLoading && (
            <p className="text-sm text-zinc-500">
              正在读取链上商家和历史 claimed 数据...
            </p>
          )}

          {merchantAddress && isError && (
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
                  <p className="font-mono">{claimedAmount} USDC</p>
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
  );
}
