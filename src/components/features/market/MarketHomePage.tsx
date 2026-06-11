import Layout from "@/components/Layout";
import { CreateMerchantDialog } from "@/components/features/market/CreateMerchantDialog";
import { MerchantInfoPanel } from "@/components/features/market/MerchantInfoPanel";
import { TradePanel } from "@/components/features/market/TradePanel";
import { useClaimedAmount, useMerchants } from "@/hooks/useContractData";
import { type Address, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";

export function MarketHomePage() {
  const { address: account, isConnected } = useAccount();
  const [merchantInput, setMerchantInput] = useState("");
  const [isCreateMerchantOpen, setIsCreateMerchantOpen] = useState(false);

  const merchantAddress = useMemo(() => {
    const value = merchantInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [merchantInput]);

  const merchantQuery = useMerchants(merchantAddress ? [merchantAddress] : []);
  const claimedQuery = useClaimedAmount(merchantAddress);
  const merchant = merchantQuery.data[0];

  const handleOpenCreateMerchant = () => {
    setIsCreateMerchantOpen(true);
  };

  return (
    <Layout>
      <section className="mb-10 py-8">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          去中心化原子化关税交易协议
        </h1>
        <p className="max-w-2xl text-zinc-400">
          输入商家地址、支付金额和可选 data，页面会读取链上商家信息、历史
          claimed 数据，并在交易前自动检查 USDC 授权额度。
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <MerchantInfoPanel
          merchantInput={merchantInput}
          merchantAddress={merchantAddress}
          merchant={merchant}
          claimedAmount={claimedQuery.data}
          isConnected={isConnected}
          isLoading={merchantQuery.isLoading || claimedQuery.isLoading}
          isError={merchantQuery.isError || claimedQuery.isError}
          onOpenCreateMerchant={handleOpenCreateMerchant}
        />

        <TradePanel
          account={account}
          isConnected={isConnected}
          merchantInput={merchantInput}
          merchantAddress={merchantAddress}
          merchantActive={Boolean(merchant?.active)}
          onMerchantInputChange={setMerchantInput}
        />
      </div>

      {isCreateMerchantOpen && (
        <CreateMerchantDialog
          account={account}
          onClose={() => setIsCreateMerchantOpen(false)}
          onRegistered={setMerchantInput}
        />
      )}
    </Layout>
  );
}
