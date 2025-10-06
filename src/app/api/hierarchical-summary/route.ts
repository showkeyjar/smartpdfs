import { togetheraiClient } from "@/lib/ai";
import assert from "assert";
import dedent from "dedent";
import { z } from "zod";
import { generateObject } from "ai";

export async function POST(req: Request) {
  const { summaries, sectionSummaries, importantChunks, language, summaryLevel } = await req.json();

  assert.ok(typeof summaries === "string");
  assert.ok(typeof language === "string");

  const level = summaryLevel?.level || 'medium';

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
    你是一个专业的文档结构分析师，擅长创建层次化的文档摘要。

    你的任务:
    1. 分析所有提供的章节摘要
    2. 创建一个统一的整体摘要（使用${targetLanguage}）
    3. 提取文档的关键要点
    4. 识别主要主题和结构

    层次化摘要原则:
    - 整体摘要应该是自包含的，读者无需阅读原文就能理解主要内容
    - 关键要点应该按重要性排序
    - 保持逻辑结构清晰
    - 使用HTML格式，确保良好的可读性

    ${level === 'brief' ? 
      '简洁模式: 整体摘要控制在3-4段，关键要点不超过5个。' : 
      level === 'detailed' ? 
      '详细模式: 可以包含更多细节和上下文，关键要点可达8-10个。' :
      '平衡模式: 适中长度，关键要点6-8个。'
    }

    输出格式要求:
    - 整体摘要使用HTML段落格式
    - 关键要点使用结构化列表
    - 每个要点包含简短描述和重要性说明
  `;

  const hierarchicalSchema = z.object({
    overallSummary: z.string().describe("整个文档的统一摘要，HTML格式"),
    keyPoints: z.array(z.object({
      point: z.string().describe("关键要点"),
      description: z.string().describe("要点的详细描述"),
      importance: z.enum(['high', 'medium', 'low']).describe("重要性级别"),
      relatedSections: z.array(z.string()).optional().describe("相关章节")
    })).describe("按重要性排序的关键要点列表"),
    documentStructure: z.object({
      mainThemes: z.array(z.string()).describe("文档的主要主题"),
      contentFlow: z.string().describe("内容流程和逻辑结构描述"),
      targetAudience: z.string().describe("目标读者群体推断")
    }).describe("文档结构分析"),
    readingRecommendations: z.array(z.string()).describe("阅读建议和重点关注区域")
  });

  try {
    const hierarchicalResponse = await generateObject({
      model: togetheraiClient("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
      schema: hierarchicalSchema,
      maxRetries: 3,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: dedent`
            请基于以下信息创建层次化摘要:

            ## 各章节摘要:
            ${summaries}

            ${sectionSummaries && sectionSummaries.length > 0 ? `
            ## 章节结构:
            ${sectionSummaries.map((section: any, index: number) => 
              `### ${section.title} (页码: ${section.pageNumbers?.join(', ') || '未知'})
              ${section.summary}`
            ).join('\n\n')}
            ` : ''}

            ${importantChunks && importantChunks.length > 0 ? `
            ## 重要内容片段:
            ${importantChunks.map((chunk: any, index: number) => 
              `**${chunk.title}** (重要性: ${chunk.importance})
              ${chunk.summary}`
            ).join('\n\n')}
            ` : ''}

            请创建一个全面的层次化摘要，帮助读者快速理解整个文档的核心内容和结构。
          `,
        },
      ],
      mode: "json",
      maxTokens: 1500,
    });

    const rayId = hierarchicalResponse.response?.headers?.["cf-ray"];
    console.log("Hierarchical summary Ray ID:", rayId);
    console.log("Token usage:", hierarchicalResponse.usage);

    const content = hierarchicalResponse.object;

    if (!content) {
      console.log("Hierarchical content was blank");
      return Response.json({ error: "层次化摘要生成失败" }, { status: 500 });
    }

    return Response.json(content);
  } catch (error) {
    console.error("Hierarchical summary error:", error);
    return Response.json({ error: "层次化摘要生成失败" }, { status: 500 });
  }
}

export const runtime = "edge";