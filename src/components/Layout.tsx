import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      {/* 导航栏 */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-black tracking-tighter text-blue-500"
            >
              ATOMIC
            </Link>
            <div className="flex gap-6 text-sm font-medium text-zinc-400">
              <Link href="/" className="hover:text-white transition-colors">
                市场大厅
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-white transition-colors"
              >
                个人看板
              </Link>
              <Link href="/gov" className="hover:text-white transition-colors">
                议会治理
              </Link>
            </div>
          </div>
          <ConnectButton />
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
