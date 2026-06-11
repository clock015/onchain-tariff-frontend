import finalGovernorAbiJson from "../../../../abis/FinalGovernor.json";
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
import { GOVERNOR_ADDRESS, TIMELOCK_ADDRESS } from "@/hooks/useContractData";
import {
  type ProposalActionArgs,
  parseBigIntInput,
} from "@/components/features/governance/utils";
import {
  type Abi,
  type Address,
  type Hex,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
} from "viem";
import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";

const finalGovernorAbi = finalGovernorAbiJson as Abi;

type ProposeParams = {
  target: Address;
  value: bigint;
  calldata: Hex;
  description: string;
  previewProposalId?: bigint;
};

type ProposalParamsPanelProps = {
  isGovernancePending: boolean;
  onActionArgsChange: (actionArgs?: ProposalActionArgs) => void;
  onUsePreviewId: (proposalId: bigint) => void;
  onPropose: (params: ProposeParams) => void;
};

export function ProposalParamsPanel({
  isGovernancePending,
  onActionArgsChange,
  onUsePreviewId,
  onPropose,
}: ProposalParamsPanelProps) {
  const [targetInput, setTargetInput] = useState("");
  const [valueInput, setValueInput] = useState("0");
  const [calldataInput, setCalldataInput] = useState("0x");
  const [description, setDescription] = useState("");

  const target = useMemo(() => {
    const value = targetInput.trim();
    return isAddress(value) ? (value as Address) : undefined;
  }, [targetInput]);
  const proposalValue = useMemo(
    () => parseBigIntInput(valueInput),
    [valueInput],
  );
  const calldata = useMemo(() => {
    const value = calldataInput.trim();
    return isHex(value) ? (value as Hex) : undefined;
  }, [calldataInput]);

  const trimmedDescription = description.trim();
  const descriptionHash = trimmedDescription
    ? keccak256(stringToHex(trimmedDescription))
    : undefined;

  const actionArgs = useMemo<ProposalActionArgs | undefined>(() => {
    if (!target || proposalValue === undefined || !calldata || !descriptionHash) {
      return undefined;
    }

    return {
      target,
      value: proposalValue,
      calldata,
      descriptionHash,
    };
  }, [calldata, descriptionHash, proposalValue, target]);

  const proposalIdPreview = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: finalGovernorAbi,
    functionName: "getProposalId",
    args: actionArgs
      ? [
          [actionArgs.target],
          [actionArgs.value],
          [actionArgs.calldata],
          actionArgs.descriptionHash,
        ]
      : undefined,
    query: {
      enabled: Boolean(actionArgs),
    },
  });

  const previewProposalId =
    typeof proposalIdPreview.data === "bigint"
      ? proposalIdPreview.data
      : undefined;

  useEffect(() => {
    onActionArgsChange(actionArgs);
  }, [actionArgs, onActionArgsChange]);

  const canPropose =
    Boolean(target) &&
    proposalValue !== undefined &&
    Boolean(calldata) &&
    Boolean(trimmedDescription) &&
    !isGovernancePending;

  const handlePropose = () => {
    if (!target || proposalValue === undefined || !calldata || !trimmedDescription) {
      return;
    }

    onPropose({
      target,
      value: proposalValue,
      calldata,
      description: trimmedDescription,
      previewProposalId,
    });
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>提案参数</CardTitle>
        <CardDescription>
          发起、排队、执行必须使用同一组 target / value / calldata /
          description。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          <p>Timelock</p>
          <p className="break-all font-mono text-zinc-200">
            {TIMELOCK_ADDRESS}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-400">Target 地址</label>
          <Input
            placeholder="0x..."
            value={targetInput}
            onChange={(event) => setTargetInput(event.target.value)}
            className="bg-zinc-950 border-zinc-800 font-mono"
          />
          {targetInput.trim() && !target && (
            <p className="text-xs text-red-300">Target 地址格式不正确。</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-400">Value (wei)</label>
          <Input
            type="number"
            min="0"
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            className="bg-zinc-950 border-zinc-800"
          />
          {proposalValue === undefined && (
            <p className="text-xs text-red-300">Value 必须是整数。</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-400">Calldata</label>
          <Input
            placeholder="0x"
            value={calldataInput}
            onChange={(event) => setCalldataInput(event.target.value)}
            className="bg-zinc-950 border-zinc-800 font-mono"
          />
          {calldataInput.trim() && !calldata && (
            <p className="text-xs text-red-300">
              Calldata 必须是 hex bytes，例如 0x 或 0x1234。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-zinc-400">Description</label>
          <Input
            placeholder="提案描述"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="bg-zinc-950 border-zinc-800"
          />
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          <p className="mb-1">预计算 Proposal ID</p>
          <p className="break-all font-mono text-zinc-200">
            {proposalIdPreview.isLoading
              ? "计算中..."
              : previewProposalId?.toString() ?? "表单完整后显示"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              if (previewProposalId !== undefined) {
                onUsePreviewId(previewProposalId);
              }
            }}
            disabled={previewProposalId === undefined}
          >
            用这个 ID 查询
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handlePropose}
          disabled={!canPropose}
        >
          {isGovernancePending ? "交易处理中..." : "发起新提案"}
        </Button>
      </CardFooter>
    </Card>
  );
}
