import { togetheraiClient } from "@/lib/ai";
import { generateText } from "ai";

export async function POST(req: Request) {
  const { text, language } = await req.json();

  if (!text || typeof text !== "string") {
    return Response.json({ error: "无效的文本输入" }, { status: 400 });
  }

  // 语言映射
  const languageMap: Record<string, string> = {
    chinese: "中文",
    english: "English", 
    japanese: "日本語",
    korean: "한국어",
    spanish: "Español",
    french: "Français",
    german: "Deutsch",
    italian: "Italiano",
    portuguese: "Português",
    russian: "Русский",
    arabic: "العربية",
    hindi: "हिन्दी",
    thai: "ไทย"
  };

  const targetLanguage = languageMap[language] || "中文";

  try {
    // 检查是否有Together AI配置
    if (!process.env.TOGETHER_API_KEY) {
      // 使用本地处理
      const sentences = text.split(/[.!?。！？\n]/).filter(s => s.trim().length > 10);
      const title = sentences[0]?.slice(0, 50) + "..." || "文档摘要";
      const summary = `<p>本文档主要内容：</p><ul>${
        sentences.slice(0, 3).map(s => `<li>${s.trim()}</li>`).join('')
      }</ul>`;
      
      return Response.json({ title, summary });
    }

    // 使用简单的文本生成，要求返回JSON格式
    const prompt = `请用${targetLanguage}为以下文档生成摘要，并以JSON格式返回。

要求：
1. 返回格式必须是有效的JSON
2. 包含title和summary两个字段
3. title: 简短的标题（不超过50字）
4. summary: HTML格式的摘要（使用<p>和<ul><li>标签）

返回格式示例：
{
  "title": "文档标题",
  "summary": "<p>摘要内容...</p>"
}

文档内容：
${text}`;

    const result = await generateText({
      model: togetheraiClient("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
      prompt: prompt,
      maxTokens: 600,
    });

    // 尝试解析JSON
    let title = "文档摘要";
    let summary = "<p>摘要生成中...</p>";

    try {
      // 提取JSON部分
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) title = parsed.title;
        if (parsed.summary) summary = parsed.summary;
      } else {
        // 如果没有找到JSON，尝试按行解析
        const lines = result.text.split('\n');
        for (const line of lines) {
          if (line.includes('title') || line.includes('标题')) {
            const titleMatch = line.match(/[:：]\s*"?([^"]+)"?/);
            if (titleMatch) title = titleMatch[1].trim();
          } else if (line.includes('summary') || line.includes('摘要')) {
            const summaryMatch = line.match(/[:：]\s*"?([^"]+)"?/);
            if (summaryMatch) summary = summaryMatch[1].trim();
          }
        }
      }
    } catch (parseError) {
      console.log("JSON解析失败，使用文本内容:", parseError);
      // 如果解析失败，使用整个结果作为摘要
      const sentences = result.text.split(/[.!?。！？]/).filter(s => s.trim().length > 10);
      title = sentences[0]?.slice(0, 50) + "..." || "文档摘要";
      summary = `<p>${sentences.slice(0, 3).join('。')}</p>`;
    }

    return Response.json({ title, summary });

  } catch (error) {
    console.error("Simple summarize error:", error);
    
    // 降级到本地处理
    const sentences = text.split(/[.!?。！？\n]/).filter(s => s.trim().length > 10);
    const title = sentences[0]?.slice(0, 50) + "..." || "文档摘要";
    const summary = `<p>本文档主要内容：</p><ul>${
      sentences.slice(0, 3).map(s => `<li>${s.trim()}</li>`).join('')
    }</ul>`;
    
    return Response.json({ title, summary });
  }
}

export const runtime = "edge";