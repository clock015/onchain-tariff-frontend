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
import { Input } from "@/components/ui/input";
import { useMockTradeData } from "@/hooks/useMockData";
import { useState } from "react"; // 引入 useState

export default function HomePage() {
  const { merchants } = useMockTradeData();
  const [amount, setAmount] = useState<string>("");

  // 计算逻辑
  const parsedAmount = parseFloat(amount) || 0;
  const merchantProceeds = (parsedAmount * 0.9).toFixed(2);
  const taxPoints = (parsedAmount * 0.09).toFixed(2);
  const governanceRights = (parsedAmount * 0.01).toFixed(2);

  return (
    <Layout>
      <section className="mb-12 text-center py-12">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          去中心化的 <span className="text-blue-500">10%-9%-1%</span> 贸易协议
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          每一笔交易都在自动缴税、积累积分、并为您铸造治理权力。
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：商家列表 */}
        <div>
          <h2 className="text-xl font-bold mb-4">活跃商家</h2>
          <div className="space-y-4">
            {merchants.map((m) => (
              <Card key={m.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm font-mono text-blue-400">
                    {m.address}
                  </CardTitle>
                  <CardDescription>受益地址: {m.beneficiary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-500">
                    当前押金: {m.deposit} USDC
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    选择该商家交易
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* 右侧：交易面板 */}
        <div className="sticky top-24">
          <Card className="bg-zinc-900 border-blue-500/30 border-2 shadow-2xl shadow-blue-500/10">
            <CardHeader>
              <CardTitle>发起贸易交易</CardTitle>
              <CardDescription>
                输入金额，系统将自动处理税费分配
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase">
                  商家地址
                </label>
                <Input
                  placeholder="0x..."
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 uppercase">
                  支付金额 (USDC)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>

              {/* 分配预览 */}
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">商家所得 (90%)</span>
                  <span className="text-green-400 font-mono">
                    +{merchantProceeds} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">退税积分 (9%)</span>
                  <span className="text-blue-400 font-mono">
                    +{taxPoints} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">治理确权 (1%)</span>
                  <span className="text-purple-400 font-mono">
                    +{governanceRights} USDC
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                执行原子贸易
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
