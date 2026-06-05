import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMockTradeData } from "@/hooks/useMockData";

export default function Dashboard() {
  const { buyerPoints, sellerPoints } = useMockTradeData();
  const refundable = Math.min(buyerPoints, sellerPoints);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-8">我的资产看板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">买方积分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{buyerPoints} USDC</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">卖方积分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sellerPoints} USDC</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-600/10 border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-blue-400 text-sm">可退税额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {refundable} USDC
            </p>
            <Button
              className="mt-4 w-full bg-blue-600"
              disabled={refundable <= 0}
            >
              一键对冲退税
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>治理权力 (Rights)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 text-sm mb-4">
              您在当前 5 年滑动窗口内的总投票权重：
            </p>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[65%]"></div>
            </div>
            <p className="mt-2 text-right text-purple-400 font-bold">
              65.00 票
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
