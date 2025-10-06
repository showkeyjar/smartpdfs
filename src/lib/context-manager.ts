import { EnhancedChunk } from "./enhanced-summarize";

export interface ContextWindow {
  chunks: EnhancedChunk[];
  totalTokens: number;
  maxTokens: number;
  priority: 'chronological' | 'importance' | 'semantic';
}

export interface ContextQuery {
  query: string;
  language: string;
  maxChunks?: number;
  includeContext?: boolean;
}

/**
 * 智能上下文管理器 - 解决大文档上下文窗口限制问题
 */
export class ContextManager {
  private maxContextTokens: number;
  private overlapTokens: number;

  constructor(maxContextTokens: number = 32000, overlapTokens: number = 500) {
    this.maxContextTokens = maxContextTokens;
    this.overlapTokens = overlapTokens;
  }

  /**
   * 根据查询智能选择相关的文档片段
   */
  async selectRelevantChunks(
    chunks: EnhancedChunk[], 
    query: ContextQuery
  ): Promise<ContextWindow> {
    // 1. 基于关键词匹配计算相关性
    const scoredChunks = await this.scoreChunkRelevance(chunks, query.query);
    
    // 2. 按相关性和重要性排序
    const sortedChunks = scoredChunks.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) * 0.7 + (a.importance || 0) * 0.3;
      const scoreB = (b.relevanceScore || 0) * 0.7 + (b.importance || 0) * 0.3;
      return scoreB - scoreA;
    });

    // 3. 选择适合上下文窗口的chunk
    const selectedChunks = this.fitToContextWindow(
      sortedChunks, 
      query.maxChunks || 10
    );

    // 4. 如果需要上下文，添加相邻chunk
    const finalChunks = query.includeContext 
      ? this.addContextualChunks(selectedChunks, chunks)
      : selectedChunks;

    return {
      chunks: finalChunks,
      totalTokens: this.estimateTokens(finalChunks),
      maxTokens: this.maxContextTokens,
      priority: 'importance'
    };
  }

  /**
   * 为特定任务创建优化的上下文窗口
   */
  async createTaskSpecificContext(
    chunks: EnhancedChunk[],
    task: 'summarize' | 'qa' | 'analysis' | 'translation',
    language: string
  ): Promise<ContextWindow> {
    let selectedChunks: EnhancedChunk[];
    let priority: ContextWindow['priority'];

    switch (task) {
      case 'summarize':
        // 摘要任务：优先选择重要内容和结构性内容
        selectedChunks = chunks
          .filter(chunk => 
            (chunk.importance || 0) > 0.6 || 
            chunk.metadata.semanticLevel === 'section'
          )
          .sort((a, b) => (b.importance || 0) - (a.importance || 0));
        priority = 'importance';
        break;

      case 'qa':
        // 问答任务：保持时间顺序，包含更多上下文
        selectedChunks = chunks.sort((a, b) => 
          a.metadata.chunkIndex - b.metadata.chunkIndex
        );
        priority = 'chronological';
        break;

      case 'analysis':
        // 分析任务：选择多样化的内容
        selectedChunks = this.selectDiverseChunks(chunks);
        priority = 'semantic';
        break;

      case 'translation':
        // 翻译任务：保持原始顺序和完整性
        selectedChunks = chunks.sort((a, b) => 
          a.metadata.chunkIndex - b.metadata.chunkIndex
        );
        priority = 'chronological';
        break;

      default:
        selectedChunks = chunks;
        priority = 'importance';
    }

    const fittedChunks = this.fitToContextWindow(selectedChunks, 15);

    return {
      chunks: fittedChunks,
      totalTokens: this.estimateTokens(fittedChunks),
      maxTokens: this.maxContextTokens,
      priority
    };
  }

  /**
   * 动态调整上下文窗口
   */
  async adaptiveContextSelection(
    chunks: EnhancedChunk[],
    currentContext: string,
    targetTokens: number = 16000
  ): Promise<ContextWindow> {
    const currentTokens = this.estimateTokens([{ text: currentContext } as EnhancedChunk]);
    const availableTokens = targetTokens - currentTokens;

    if (availableTokens <= 0) {
      return {
        chunks: [],
        totalTokens: currentTokens,
        maxTokens: targetTokens,
        priority: 'importance'
      };
    }

    // 按重要性选择chunk，直到达到token限制
    const sortedChunks = chunks.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    const selectedChunks: EnhancedChunk[] = [];
    let usedTokens = 0;

    for (const chunk of sortedChunks) {
      const chunkTokens = this.estimateTokens([chunk]);
      if (usedTokens + chunkTokens <= availableTokens) {
        selectedChunks.push(chunk);
        usedTokens += chunkTokens;
      }
    }

    return {
      chunks: selectedChunks,
      totalTokens: currentTokens + usedTokens,
      maxTokens: targetTokens,
      priority: 'importance'
    };
  }

  private async scoreChunkRelevance(
    chunks: EnhancedChunk[], 
    query: string
  ): Promise<Array<EnhancedChunk & { relevanceScore: number }>> {
    const queryKeywords = this.extractKeywords(query.toLowerCase());
    
    return chunks.map(chunk => {
      let score = 0;
      const chunkText = chunk.text.toLowerCase();
      const chunkKeywords = chunk.keywords || [];

      // 关键词匹配评分
      for (const keyword of queryKeywords) {
        if (chunkText.includes(keyword)) {
          score += 0.3;
        }
      }

      // chunk关键词匹配评分
      for (const chunkKeyword of chunkKeywords) {
        if (queryKeywords.some(qk => chunkKeyword.toLowerCase().includes(qk))) {
          score += 0.4;
        }
      }

      // 标题匹配评分
      if (chunk.title && queryKeywords.some(kw => 
        chunk.title!.toLowerCase().includes(kw)
      )) {
        score += 0.5;
      }

      return {
        ...chunk,
        relevanceScore: Math.min(score, 1.0)
      };
    });
  }

  private fitToContextWindow(
    chunks: EnhancedChunk[], 
    maxChunks: number
  ): EnhancedChunk[] {
    const selected: EnhancedChunk[] = [];
    let totalTokens = 0;

    for (const chunk of chunks.slice(0, maxChunks)) {
      const chunkTokens = this.estimateTokens([chunk]);
      
      if (totalTokens + chunkTokens <= this.maxContextTokens) {
        selected.push(chunk);
        totalTokens += chunkTokens;
      } else {
        break;
      }
    }

    return selected;
  }

  private addContextualChunks(
    selectedChunks: EnhancedChunk[], 
    allChunks: EnhancedChunk[]
  ): EnhancedChunk[] {
    const contextualChunks = new Set(selectedChunks);
    
    for (const chunk of selectedChunks) {
      const chunkIndex = chunk.metadata.chunkIndex;
      
      // 添加前后相邻的chunk
      const prevChunk = allChunks.find(c => c.metadata.chunkIndex === chunkIndex - 1);
      const nextChunk = allChunks.find(c => c.metadata.chunkIndex === chunkIndex + 1);
      
      if (prevChunk) contextualChunks.add(prevChunk);
      if (nextChunk) contextualChunks.add(nextChunk);
    }

    return Array.from(contextualChunks).sort((a, b) => 
      a.metadata.chunkIndex - b.metadata.chunkIndex
    );
  }

  private selectDiverseChunks(chunks: EnhancedChunk[]): EnhancedChunk[] {
    // 按语义级别和重要性选择多样化的内容
    const sectionChunks = chunks.filter(c => c.metadata.semanticLevel === 'section');
    const importantChunks = chunks.filter(c => (c.importance || 0) > 0.7);
    const regularChunks = chunks.filter(c => 
      c.metadata.semanticLevel !== 'section' && (c.importance || 0) <= 0.7
    );

    // 平衡选择
    const selected = [
      ...sectionChunks.slice(0, 3),
      ...importantChunks.slice(0, 5),
      ...regularChunks.slice(0, 7)
    ];

    return selected.sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex);
  }

  private estimateTokens(chunks: EnhancedChunk[], languageCode?: string): number {
    const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    
    // 根据语言调整token估算
    let ratio = 2.5; // 默认比例
    
    if (languageCode) {
      const languageRatios: Record<string, number> = {
        chinese: 1.5,
        japanese: 2.0,
        korean: 2.5,
        english: 4.0,
        spanish: 4.5,
        french: 4.2,
        german: 3.8,
        arabic: 3.5,
        hindi: 2.8,
        thai: 2.2
      };
      
      ratio = languageRatios[languageCode] || 2.5;
    }
    
    return Math.ceil(totalChars / ratio);
  }

  private extractKeywords(text: string): string[] {
    // 简单的关键词提取
    return text
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10);
  }
}