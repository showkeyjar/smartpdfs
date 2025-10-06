// AI配置 - 支持多种AI服务或本地处理

export interface AIProvider {
  name: string;
  enabled: boolean;
  generateSummary: (text: string, language: string) => Promise<{title: string, summary: string}>;
}

// Together AI 提供者
export const togetherAIProvider: AIProvider = {
  name: "Together AI",
  enabled: !!process.env.TOGETHER_API_KEY,
  generateSummary: async (text: string, language: string) => {
    // 在浏览器环境中使用绝对URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    // 直接使用最稳定的simple-summarize API
    try {
      const response = await fetch(`${baseUrl}/api/simple-summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, language }),
      });
      
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`API响应错误: ${response.status}`);
      }
    } catch (error) {
      console.log("Simple API failed:", error);
      throw new Error("AI摘要API失败");
    }
  }
};

// 本地摘要提供者（使用本地摘要器）
export const localProvider: AIProvider = {
  name: "本地处理",
  enabled: true,
  generateSummary: async (text: string, language: string) => {
    const { LocalSummarizer } = await import('./local-summarizer');
    const result = LocalSummarizer.summarize(text, language);
    
    return {
      title: result.title,
      summary: result.summary
    };
  }
};

// 获取可用的AI提供者
export function getAvailableProvider(): AIProvider {
  if (togetherAIProvider.enabled) {
    return togetherAIProvider;
  }
  return localProvider;
}

// 检查是否有AI服务可用
export function hasAIService(): boolean {
  return togetherAIProvider.enabled;
}

// 获取推荐配置信息
export function getRecommendedSetup() {
  if (hasAIService()) {
    return {
      status: "optimal",
      message: "AI服务已配置，可使用完整功能",
      provider: togetherAIProvider.name
    };
  } else {
    return {
      status: "basic",
      message: "使用本地处理模式，功能有限。建议配置Together AI获得更好体验",
      provider: localProvider.name,
      setupInstructions: [
        "1. 注册Together AI账号: https://together.ai",
        "2. 获取API密钥",
        "3. 在.env文件中设置 TOGETHER_API_KEY=your_key_here",
        "4. 重启应用"
      ]
    };
  }
}