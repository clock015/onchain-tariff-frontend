import finalGovernorAbiJson from "../../abis/FinalGovernor.json";
import { GOVERNOR_ADDRESS } from "@/hooks/useContractData";
import { type Abi, type Address, type Hex } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

const finalGovernorAbi = finalGovernorAbiJson as Abi;

type ProposeParams = {
  target: Address;
  value: bigint;
  calldata: Hex;
  description: string;
};

type ProposalLifecycleParams = {
  target: Address;
  value: bigint;
  calldata: Hex;
  descriptionHash: Hex;
};

type CastVoteParams = {
  proposalId: bigint;
  support: 0 | 1 | 2;
};

// Governor 写交易：发起提案和投票。读提案数据仍然放在 useContractData.ts 里。
export function useGovernanceTransaction() {
  const {
    data: hash,
    error: writeError,
    isPending: isWriting,
    writeContract,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const propose = ({ target, value, calldata, description }: ProposeParams) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: finalGovernorAbi,
      functionName: "propose",
      args: [[target], [value], [calldata], description],
    });
  };

  const castVote = ({ proposalId, support }: CastVoteParams) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: finalGovernorAbi,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  const queueProposal = ({
    target,
    value,
    calldata,
    descriptionHash,
  }: ProposalLifecycleParams) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: finalGovernorAbi,
      functionName: "queue",
      args: [[target], [value], [calldata], descriptionHash],
    });
  };

  const executeProposal = ({
    target,
    value,
    calldata,
    descriptionHash,
  }: ProposalLifecycleParams) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: finalGovernorAbi,
      functionName: "execute",
      args: [[target], [value], [calldata], descriptionHash],
    });
  };

  return {
    hash,
    propose,
    castVote,
    queueProposal,
    executeProposal,
    isPending: isWriting || isConfirming,
    isWriting,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
  };
}
