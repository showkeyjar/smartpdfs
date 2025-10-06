import { PDFDocumentProxy } from "pdfjs-dist";
import { TextChunk, AdaptiveChunkingStrategy, ChunkingStrategy } from "./chunking-strategies";

export interface SummaryLevel {
  level: 'detailed' | 'medium' | 'brief';
  maxTokens: number;
  prompt: string;
}

export interface EnhancedChunk extends TextChunk {
  summary?: string;
  title?: string;
  keywords?: string[];
  importance?: number; // 0-1 重要性评分
  relationships?: string[]; // 与其他chunk的关系
}

export class EnhancedSummarizer {
  private chunkingStrategy: ChunkingStrategy;
  
  constructor(strategy?: ChunkingStrategy) {
    this.chunkingStrategy = strategy || new AdaptiveChunkingStrategy();
  }

  async getPdfTextWithMetadata(pdf: PDFDocumentProxy) {
    const numPages = pdf.numPages;
    let fullText = "";
    const pageMetadata: Array<{pageNum: number, startIndex: number, endIndex: number}> = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let lastY = null;
      let pageText = "";
      const pageStartIndex = fullText.length;

      // 处理每个文本项
      for (const item of textContent.items) {
        if ("str" in item) {
          // 基于Y位置检测新行
          if (lastY !== null && lastY !== item.transform[5]) {
            pageText += "\n";

            // 如果有显著的垂直间距，添加额外的换行
            if (lastY - item.transform[5] > 12) {
              pageText += "\n";
            }
          }

          pageText += item.str;
          lastY = item.transform[5];
        }
      }

      fullText += pageText + "\n\n";
      
      pageMetadata.push({
        pageNum,
        startIndex: pageStartIndex,
        endIndex: fullText.length
      });
    }

    return { fullText, pageMetadata };
  }

  async chunkPdfEnhanced(pdf: PDFDocumentProxy): Promise<EnhancedChunk[]> {
    const { fullText, pageMetadata } = await this.getPdfTextWithMetadata(pdf);
    
    // 使用智能分块策略
    const baseChunks = await this.chunkingStrategy.chunk(fullText);
    
    // 增强chunk信息
    const enhancedChunks: EnhancedChunk[] = baseChunks.map((chunk, index) => {
      // 计算chunk所在的页码
      const pageNumbers = this.getPageNumbers(chunk, pageMetadata);
      
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          pageNumbers
        }
      };
    });

    return enhancedChunks;
  }

  private getPageNumbers(
    chunk: TextChunk, 
    pageMetadata: Array<{pageNum: number, startIndex: number, endIndex: number}>
  ): number[] {
    const pageNumbers: number[] = [];
    
    for (const page of pageMetadata) {
      // 检查chunk是否与页面有重叠
      if (chunk.metadata.startIndex < page.endIndex && 
          chunk.metadata.endIndex > page.startIndex) {
        pageNumbers.push(page.pageNum);
      }
    }
    
    return pageNumbers;
  }

  async summarizeWithHierarchy(
    chunks: EnhancedChunk[], 
    language: string,
    summaryLevel: SummaryLevel = {
      level: 'medium',
      maxTokens: 500,
      prompt: 'Create a comprehensive summary'
    }
  ) {
    // 1. 并行处理各个chunk的摘要
    const chunkSummaries = await this.processChunksInParallel(chunks, language, summaryLevel);
    
    // 2. 生成层次化摘要
    const hierarchicalSummary = await this.generateHierarchicalSummary(
      chunkSummaries, 
      language, 
      summaryLevel
    );
    
    return {
      chunks: chunkSummaries,
      hierarchicalSummary,
      metadata: {
        totalChunks: chunks.length,
        summaryLevel: summaryLevel.level,
        language
      }
    };
  }

  private async processChunksInParallel(
    chunks: EnhancedChunk[], 
    language: string,
    summaryLevel: SummaryLevel
  ): Promise<EnhancedChunk[]> {
    const batchSize = 5; // 控制并发数量
    const results: EnhancedChunk[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (chunk) => {
        try {
          const response = await fetch("/api/enhanced-summarize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              text: chunk.text, 
              language,
              summaryLevel,
              chunkMetadata: chunk.metadata
            }),
          });
          
          const data = await response.json();
          
          return {
            ...chunk,
            summary: data.summary,
            title: data.title,
            keywords: data.keywords,
            importance: data.importance
          };
        } catch (error) {
          console.error(`处理chunk ${chunk.metadata.chunkIndex} 时出错:`, error);
          return chunk; // 返回原始chunk
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 添加小延迟避免API限制
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private async generateHierarchicalSummary(
    chunks: EnhancedChunk[], 
    language: string,
    summaryLevel: SummaryLevel
  ) {
    // 按重要性和语义级别分组
    const importantChunks = chunks
      .filter(chunk => (chunk.importance || 0) > 0.7)
      .sort((a, b) => (b.importance || 0) - (a.importance || 0));
    
    const sectionSummaries = chunks
      .filter(chunk => chunk.metadata.semanticLevel === 'section')
      .map(chunk => ({
        title: chunk.title || `第${chunk.metadata.chunkIndex + 1}部分`,
        summary: chunk.summary || chunk.text.slice(0, 200) + '...',
        pageNumbers: chunk.metadata.pageNumbers
      }));

    // 生成整体摘要
    const allSummaries = chunks
      .map(chunk => chunk.summary)
      .filter(Boolean)
      .join('\n\n');

    const response = await fetch("/api/hierarchical-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        summaries: allSummaries,
        sectionSummaries,
        importantChunks: importantChunks.slice(0, 5), // 取前5个重要chunk
        language,
        summaryLevel
      }),
    });

    const hierarchicalData = await response.json();

    return {
      overallSummary: hierarchicalData.overallSummary,
      keyPoints: hierarchicalData.keyPoints,
      sectionBreakdown: sectionSummaries,
      importantHighlights: importantChunks.slice(0, 3).map(chunk => ({
        title: chunk.title,
        summary: chunk.summary,
        pageNumbers: chunk.metadata.pageNumbers,
        importance: chunk.importance
      }))
    };
  }

  // 流式处理大文档
  async summarizeStreamEnhanced(chunks: EnhancedChunk[], language: string) {
    let reading = true;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 按重要性排序，优先处理重要内容
          const sortedChunks = [...chunks].sort((a, b) => 
            (b.importance || 0) - (a.importance || 0)
          );

          for (const chunk of sortedChunks) {
            if (!reading) break;

            try {
              const response = await fetch("/api/enhanced-summarize", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  text: chunk.text, 
                  language,
                  chunkMetadata: chunk.metadata
                }),
              });

              const data = await response.json();
              
              if (reading) {
                controller.enqueue({
                  ...chunk,
                  summary: data.summary,
                  title: data.title,
                  keywords: data.keywords,
                  importance: data.importance,
                  processingOrder: sortedChunks.indexOf(chunk)
                });
              }
            } catch (error) {
              console.error(`处理chunk ${chunk.metadata.chunkIndex} 时出错:`, error);
              // 继续处理下一个chunk
            }

            // 添加小延迟
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },

      cancel() {
        console.log("增强摘要流被取消");
        reading = false;
      },
    });

    return stream;
  }
}

// 预定义的摘要级别
export const SUMMARY_LEVELS: Record<string, SummaryLevel> = {
  brief: {
    level: 'brief',
    maxTokens: 200,
    prompt: 'Create a very concise summary focusing only on the main points'
  },
  medium: {
    level: 'medium',
    maxTokens: 500,
    prompt: 'Create a balanced summary with key points and supporting details'
  },
  detailed: {
    level: 'detailed',
    maxTokens: 800,
    prompt: 'Create a comprehensive summary preserving important details and context'
  }
};