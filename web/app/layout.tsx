import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ChatBot } from "@/components/ChatBot";

export const metadata: Metadata = {
  title: "小型项目管理",
  description: "需求池 · 研发流转 · 看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans text-zinc-900">
        <Providers>
          {children}
          <ChatBot />
        </Providers>
      </body>
    </html>
  );
}
