import { togetheraiClient } from "@/lib/ai";
import assert from "assert";
import dedent from "dedent";
import { z } from "zod";
import { generateObject } from "ai";

export async function POST(req: Request) {
  const { text, language, summaryLevel, chunkMetadata } = await req.json();

  assert.ok(typeof text === "string");
  assert.ok(typeof language === "string");

  const level = summaryLevel?.level || 'medium';
  const maxTokens = summaryLevel?.maxTokens || 500;

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
    你是一个专业的文档分析和摘要专家。

    你必须返回一个完整的JSON对象，包含以下所有字段：
    - title: 文档标题（字符串）
    - summary: HTML格式摘要（字符串）
    - keywords: 关键词数组（至少3个字符串）
    - importance: 重要性评分（0-1之间的数字）
    - contentType: 内容类型（从指定枚举中选择）

    你的任务:
    1. 仔细分析提供的文档片段
    2. 创建${level === 'brief' ? '简洁' : level === 'detailed' ? '详细' : '平衡'}的摘要（使用${targetLanguage}）
    3. 生成描述性标题（使用${targetLanguage}）
    4. 提取3-8个关键词
    5. 评估内容重要性（0-1分）
    6. 确定内容类型

    摘要指导原则:
    - 使用HTML格式化摘要
    - 使用<p>标签分段（每段2-3句话）
    - 使用<ul>和<li>标签列出要点
    - 确保HTML标签正确闭合

    重要性评分标准:
    - 0.9-1.0: 核心概念、主要结论、关键发现
    - 0.7-0.8: 重要支撑信息、详细解释
    - 0.5-0.6: 一般信息、背景内容
    - 0.3-0.4: 补充信息、示例
    - 0.0-0.2: 次要信息、过渡内容

    内容类型选择:
    - introduction: 介绍性内容
    - main_content: 主要内容
    - conclusion: 结论性内容
    - example: 示例内容
    - reference: 参考资料
    - acknowledgement: 致谢内容

    关键词要求:
    - 提取3-8个最相关的关键词或短语
    - 优先选择专业术语、核心概念
    - 使用${targetLanguage}

    重要: 必须返回完整的JSON对象，包含所有必需字段。
    
    ${targetLanguage === "中文" ? "请使用简体中文进行分析和摘要。" : 
      targetLanguage === "日本語" ? "日本語で分析と要約を行ってください。" :
      targetLanguage === "한국어" ? "한국어로 분석과 요약을 해주세요." :
      `Please provide analysis and summary in ${targetLanguage}.`}
  `;

  const enhancedSummarySchema = z.object({
    title: z.string().min(1).describe("内容的描述性标题"),
    summary: z.string().min(1).describe("格式化的HTML摘要，包含适当的段落和要点分隔"),
    keywords: z.array(z.string()).min(1).max(10).describe("3-8个关键词或短语"),
    importance: z.number().min(0).max(1).describe("内容重要性评分 (0-1)"),
    contentType: z.enum(['introduction', 'main_content', 'conclusion', 'example', 'reference', 'acknowledgement', 'acknowledgements']).describe("内容类型分类")
  });

  // 检查是否有Together AI配置
  if (!process.env.TOGETHER_API_KEY) {
    console.log("未配置Together AI，使用本地摘要");
    const { LocalSummarizer } = await import('@/lib/local-summarizer');
    const localResult = LocalSummarizer.summarize(text, language);
    return Response.json(localResult);
  }

  try {
    const summaryResponse = await generateObject({
      model: togetheraiClient("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
      schema: enhancedSummarySchema,
      maxRetries: 2, // 减少重试次数
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `请分析以下文档片段并生成增强摘要:\n\n${text}${
            chunkMetadata ? `\n\n元数据: 片段${chunkMetadata.chunkIndex + 1}${
              chunkMetadata.pageNumbers ? `, 页码: ${chunkMetadata.pageNumbers.join(', ')}` : ''
            }${chunkMetadata.semanticLevel ? `, 类型: ${chunkMetadata.semanticLevel}` : ''}` : ''
          }`,
        },
      ],
      mode: "json",
      maxTokens: maxTokens + 100,
    });

    const rayId = summaryResponse.response?.headers?.["cf-ray"];
    console.log("Ray ID:", rayId);
    console.log("Token usage:", summaryResponse.usage);

    const content = summaryResponse.object;

    if (!content) {
      throw new Error("AI返回内容为空");
    }

    return Response.json(content);
  } catch (error) {
    console.error("Enhanced summarize error:", error);
    
    // 降级到本地摘要器
    console.log("AI摘要失败，降级到本地摘要模式");
    
    const { LocalSummarizer } = await import('@/lib/local-summarizer');
    const localResult = LocalSummarizer.summarize(text, language);
    
    return Response.json(localResult);
  }
}

export const runtime = "edge";