"use client";

import { useEffect, useState } from "react";

interface AIStatus {
  status: "optimal" | "basic";
  message: string;
  provider: string;
  setupInstructions?: string[];
}

export default function AIStatusBadge() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查AI服务状态
    const checkAIStatus = async () => {
      try {
        const response = await fetch("/api/ai-status");
        if (response.ok) {
          const status = await response.json();
          setAiStatus(status);
        } else {
          throw new Error("API不可用");
        }
      } catch (error) {
        // 如果API不可用，假设是基础模式
        setAiStatus({
          status: "basic",
          message: "使用本地处理模式",
          provider: "本地处理"
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAIStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        ⏳ 检测中...
      </div>
    );
  }

  if (!aiStatus) return null;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
      aiStatus.status === "optimal" 
        ? "bg-green-100 text-green-800" 
        : "bg-blue-100 text-blue-800"
    }`}>
      {aiStatus.status === "optimal" ? "🤖" : "📱"} {aiStatus.provider}
      {aiStatus.status === "basic" && (
        <span className="ml-1 text-xs opacity-75">
          (可配置AI获得更好体验)
        </span>
      )}
    </div>
  );
}