import { PDFDocumentProxy } from "pdfjs-dist";
import assert from "assert";
import { EnhancedSummarizer, EnhancedChunk, SUMMARY_LEVELS } from "./enhanced-summarize";

export type Chunk = {
  text: string;
  summary?: string;
  title?: string;
};

// 向后兼容的增强摘要器实例
const enhancedSummarizer = new EnhancedSummarizer();

export async function getPdfText(pdf: PDFDocumentProxy) {
  const numPages = pdf.numPages;
  let fullText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY = null;
    let pageText = "";

    // Process each text item
    for (const item of textContent.items) {
      if ("str" in item) {
        // Check for new line based on Y position
        if (lastY !== null && lastY !== item.transform[5]) {
          pageText += "\n";

          // Add extra line break if there's significant vertical space
          if (lastY - item.transform[5] > 12) {
            // Adjust this threshold as needed
            pageText += "\n";
          }
        }

        pageText += item.str;
        lastY = item.transform[5];
      }
    }

    fullText += pageText + "\n\n"; // Add double newline between pages
  }

  return fullText;
}

export async function chunkPdf(pdf: PDFDocumentProxy) {
  // 保持向后兼容的简单分块
  const maxChunkSize = 50_000;
  const fullText = await getPdfText(pdf);

  const chunks: Chunk[] = [];
  const chunkCharSize = Math.min(maxChunkSize, Math.ceil(fullText.length / 4));

  for (let i = 0; i < fullText.length; i += chunkCharSize) {
    const text = fullText.slice(i, i + chunkCharSize);
    chunks.push({ text });
  }

  return chunks;
}

// 新的增强分块函数
export async function chunkPdfEnhanced(pdf: PDFDocumentProxy): Promise<EnhancedChunk[]> {
  return enhancedSummarizer.chunkPdfEnhanced(pdf);
}

// 智能摘要函数，自动选择最佳策略
export async function summarizeIntelligent(
  pdf: PDFDocumentProxy, 
  language: string = "中文",
  summaryLevel: keyof typeof SUMMARY_LEVELS = "medium"
) {
  const chunks = await enhancedSummarizer.chunkPdfEnhanced(pdf);
  const levelConfig = SUMMARY_LEVELS[summaryLevel];
  
  return enhancedSummarizer.summarizeWithHierarchy(chunks, language, levelConfig);
}

export async function summarizeStream(chunks: Chunk[], language: string) {
  const { getAvailableProvider, hasAIService } = await import('./ai-config');
  const provider = getAvailableProvider();
  
  let reading = true;
  const stream = new ReadableStream({
    async start(controller) {
      // 如果有AI服务，使用并行处理；否则使用串行处理避免过载
      if (hasAIService()) {
        const promises = chunks.map(async (chunk, index) => {
          try {
            // 添加延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, index * 100));
            
            const data = await provider.generateSummary(chunk.text, language);
            if (reading) {
              controller.enqueue({
                ...chunk,
                summary: data.summary,
                title: data.title,
              });
            }
          } catch (e) {
            console.log(`摘要生成错误 (chunk ${index}):`, e);
            // 降级到简单摘要
            if (reading) {
              const fallbackTitle = chunk.text.split(/[.!?。！？]/)[0]?.slice(0, 30) + "..." || `第${index + 1}部分`;
              controller.enqueue({
                ...chunk,
                summary: `<p>${chunk.text.slice(0, 200)}...</p>`,
                title: fallbackTitle,
              });
            }
          }
        });

        await Promise.all(promises);
      } else {
        // 本地处理模式，串行处理
        for (let i = 0; i < chunks.length; i++) {
          if (!reading) break;
          
          const chunk = chunks[i];
          try {
            const data = await provider.generateSummary(chunk.text, language);
            if (reading) {
              controller.enqueue({
                ...chunk,
                summary: data.summary,
                title: data.title,
              });
            }
          } catch (e) {
            console.log(`本地摘要错误 (chunk ${i}):`, e);
            if (reading) {
              const fallbackTitle = chunk.text.split(/[.!?。！？]/)[0]?.slice(0, 30) + "..." || `第${i + 1}部分`;
              controller.enqueue({
                ...chunk,
                summary: `<p>${chunk.text.slice(0, 200)}...</p>`,
                title: fallbackTitle,
              });
            }
          }
        }
      }

      controller.close();
    },

    cancel() {
      console.log("read stream canceled");
      reading = false;
    },
  });

  return stream;
}

export async function generateQuickSummary(chunks: Chunk[], language: string) {
  const { getAvailableProvider } = await import('./ai-config');
  const provider = getAvailableProvider();
  
  const allSummaries = chunks.map((chunk) => chunk.summary).join("\n\n");

  try {
    const result = await provider.generateSummary(allSummaries, language);
    
    console.log("title", result.title);
    assert.ok(typeof result.title === "string");
    assert.ok(typeof result.summary === "string");

    return result;
  } catch (error) {
    console.log("快速摘要生成失败，使用降级方案:", error);
    
    // 降级方案：简单合并
    return {
      title: "文档摘要",
      summary: `<p>本文档包含 ${chunks.length} 个主要部分：</p><ul>${
        chunks.map((chunk, i) => `<li>第${i+1}部分: ${chunk.title || '内容片段'}</li>`).join('')
      }</ul>`
    };
  }
}

export type ImageGenerationResponse = {
  url: string;
};

// 图片生成功能已移除，改为可选功能
export async function generateImage(summary: string): Promise<string> {
  // 返回默认图片或不生成图片
  return "/default-pdf-cover.jpg";
}
