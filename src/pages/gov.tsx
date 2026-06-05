import Layout from "@/components/Layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; // 记得运行 npx shadcn@latest add progress
import { Badge } from "@/components/ui/badge"; // 记得运行 npx shadcn@latest add badge
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 模拟提案数据
const MOCK_PROPOSALS = [
  {
    id: "1",
    title: "提议将交易税率从 10% 降低至 8%",
    proposer: "0xAlice...666",
    description: "当前的 10% 税率在市场淡季过高，降低税率有助于提高交易频率。",
    status: "进行中",
    buyerSupport: 85, // 买方支持率 85%
    sellerSupport: 40, // 卖方支持率 40%
    endTime: "2024-05-20",
  },
  {
    id: "2",
    title: "将商家保证金门槛提高至 2000 USDC",
    proposer: "0xBob...888",
    description: "为了防止恶意低质商家进入，需要提高准入门槛。",
    status: "已通过",
    buyerSupport: 70,
    sellerSupport: 75,
    endTime: "2024-05-10",
  },
];

export default function GovPage() {
  return (
    <Layout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">议会治理</h1>
          <p className="text-zinc-400 mt-2">
            基于买卖双方权利代币的双重共识决策中心
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">发起新提案</Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-zinc-900 border-zinc-800 mb-6">
          <TabsTrigger value="active">活跃提案</TabsTrigger>
          <TabsTrigger value="closed">已结束</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="grid grid-cols-1 gap-6">
          {MOCK_PROPOSALS.filter((p) => p.status === "进行中").map(
            (proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ),
          )}
        </TabsContent>

        <TabsContent value="closed" className="grid grid-cols-1 gap-6">
          {MOCK_PROPOSALS.filter((p) => p.status === "已通过").map(
            (proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ),
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

// 核心组件：双重共识进度卡片
function ProposalCard({ proposal }: { proposal: any }) {
  // 计算最终有效共识度（取买卖双方的交集，即最小值）
  const effectiveConsensus = Math.min(
    proposal.buyerSupport,
    proposal.sellerSupport,
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Badge
            className={
              proposal.status === "进行中"
                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                : "bg-green-500/10 text-green-500 border-green-500/20"
            }
          >
            {proposal.status}
          </Badge>
          <span className="text-xs text-zinc-500 font-mono">
            ID: {proposal.id}
          </span>
        </div>
        <CardTitle className="mt-4 text-xl">{proposal.title}</CardTitle>
        <CardDescription className="line-clamp-2 mt-2">
          {proposal.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 买方进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">买方支持率 (Buyer Rights)</span>
            <span className="font-mono">{proposal.buyerSupport}%</span>
          </div>
          <Progress
            value={proposal.buyerSupport}
            className="h-2 bg-zinc-800"
            indicatorClassName="bg-blue-500"
          />
        </div>

        {/* 卖方进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">卖方支持率 (Seller Rights)</span>
            <span className="font-mono">{proposal.sellerSupport}%</span>
          </div>
          <Progress
            value={proposal.sellerSupport}
            className="h-2 bg-zinc-800"
            indicatorClassName="bg-purple-500"
          />
        </div>

        {/* 最终共识状态 */}
        <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs uppercase text-zinc-500 font-bold">
                最终有效共识度
              </p>
              <p className="text-2xl font-black text-white">
                {effectiveConsensus}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">法定通过阈值</p>
              <p className="text-sm font-bold">51%</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-400 italic">
            *
            根据双重共识逻辑：提案必须同时获得买卖双方的支持，通过率取决于两者中的最小值。
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-4">
        <Button className="flex-1 bg-zinc-800 hover:bg-blue-600 transition-colors">
          投赞成票
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-zinc-700 hover:bg-red-600/10 hover:text-red-500"
        >
          投反对票
        </Button>
      </CardFooter>
    </Card>
  );
}
