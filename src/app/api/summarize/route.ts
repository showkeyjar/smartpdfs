import { togetheraiClient } from "@/lib/ai";
import assert from "assert";
import dedent from "dedent";
import { z } from "zod";
import { generateObject } from "ai";

export async function POST(req: Request) {
  const { text, language } = await req.json();

  assert.ok(typeof text === "string");
  assert.ok(typeof language === "string");

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

  const targetLanguage = languageMap[language] || language;

  const systemPrompt = dedent`
    你是一个专业的文档摘要专家，能够使用多种语言进行摘要。

    你的任务:
    1. 仔细阅读我提供的文档片段
    2. 使用${targetLanguage}创建简洁的摘要
    3. 使用${targetLanguage}生成简短、描述性的标题

    摘要指导原则:
    - 使用HTML格式化摘要
    - 使用<p>标签分段（每段2-3句话）
    - 使用<ul>和<li>标签列出要点
    - 需要时使用<h3>标签作为小标题，但不要在第一段重复主标题
    - 使用适当的HTML标签确保良好的间距

    摘要应该结构良好、易于浏览，同时保持准确性和完整性。
    请在开始摘要之前彻底分析文本。

    重要: 只输出有效的HTML，不要使用markdown或纯文本换行。
    
    ${targetLanguage === "中文" ? "请使用简体中文进行摘要。" : 
      targetLanguage === "日本語" ? "日本語で要約してください。" :
      targetLanguage === "한국어" ? "한국어로 요약해 주세요." :
      `Please provide the summary in ${targetLanguage}.`}
  `;

  const summarySchema = z.object({
    title: z.string().describe("A title for the summary"),
    summary: z
      .string()
      .describe(
        "The actual summary of the text containing new lines breaks between paragraphs or phrases for better readability.",
      ),
  });

  try {
    const summaryResponse = await generateObject({
      model: togetheraiClient("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
      schema: summarySchema,
      maxRetries: 3,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      mode: "json",
      maxTokens: 800,
    });

    const rayId = summaryResponse.response?.headers?.["cf-ray"];
    console.log("Ray ID:", rayId);
    console.log("Token usage:", summaryResponse.usage);

    const content = summaryResponse.object;

    if (!content) {
      console.log("Content was blank");
      return Response.json({ error: "生成内容为空" }, { status: 500 });
    }

    return Response.json(content);
  } catch (error) {
    console.error("Summarize error:", error);
    
    // 降级方案：返回简单摘要
    const sentences = text.split(/[.!?。！？]/);
    const firstSentences = sentences.slice(0, 3).join('。');
    
    const fallbackSummary = {
      title: firstSentences.slice(0, 50) + "..." || "文档摘要",
      summary: `<p>${firstSentences}</p><p>文档长度：约${text.length}字符</p>`
    };
    
    return Response.json(fallbackSummary);
  }
}

export const runtime = "edge";
