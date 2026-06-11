import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMerchantRegistration } from "@/hooks/useMerchantRegistration";
import { X } from "lucide-react";
import { type Address, isAddress } from "viem";
import { useEffect, useMemo, useState } from "react";
import { shortenAddress, toNumber } from "./utils";

type CreateMerchantDialogProps = {
  account?: Address;
  onClose: () => void;
  onRegistered: (merchantAddress: Address) => void;
};

export function CreateMerchantDialog({
  account,
  onClose,
  onRegistered,
}: CreateMerchantDialogProps) {
  const [depositAmount, setDepositAmount] = useState("100");
  const [interactionTargetInput, setInteractionTargetInput] = useState(
    account ?? "",
  );

  const interactionTarget = useMemo(() => {
    const value = interactionTargetInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [interactionTargetInput]);

  const merchantRegistration = useMerchantRegistration({
    account,
    depositAmount,
  });

  const depositIsValid = toNumber(depositAmount) > 0;
  const canCreateMerchant =
    Boolean(account) &&
    Boolean(interactionTarget) &&
    depositIsValid &&
    !merchantRegistration.isPending &&
    !merchantRegistration.isReadingAllowance;

  useEffect(() => {
    if (!merchantRegistration.isRegisterSuccess || !account) return;
    onRegistered(account);
    onClose();
  }, [account, merchantRegistration.isRegisterSuccess, onClose, onRegistered]);

  const handleCreateMerchant = () => {
    if (!interactionTarget || !depositIsValid) return;

    if (merchantRegistration.needsApproval) {
      merchantRegistration.approve();
      return;
    }

    merchantRegistration.registerMerchant(interactionTarget);
  };

  const buttonText = (() => {
    if (merchantRegistration.isApproving) return "授权确认中...";
    if (merchantRegistration.isRegistering) return "注册处理中...";
    if (merchantRegistration.isReadingAllowance) return "读取授权额度...";
    if (merchantRegistration.needsApproval) return "授权押金";
    return "创建商家";
  })();

  return (
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
            onClick={onClose}
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
              onChange={(event) => setInteractionTargetInput(event.target.value)}
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
          <Button variant="outline" className="border-zinc-700" onClick={onClose}>
            取消
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleCreateMerchant}
            disabled={!canCreateMerchant}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
