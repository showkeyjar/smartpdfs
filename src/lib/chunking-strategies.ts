import { PDFDocumentProxy } from "pdfjs-dist";

export interface ChunkingStrategy {
  name: string;
  chunk(text: string, metadata?: any): Promise<TextChunk[]>;
}

export interface TextChunk {
  text: string;
  metadata: {
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
    semanticLevel?: 'paragraph' | 'section' | 'chapter';
    title?: string;
    pageNumbers?: number[];
  };
}

/**
 * 语义感知分块策略 - 基于段落和章节结构
 */
export class SemanticChunkingStrategy implements ChunkingStrategy {
  name = "semantic";
  
  constructor(
    private maxChunkSize: number = 4000,
    private overlapSize: number = 200,
    private minChunkSize: number = 500
  ) {}

  async chunk(text: string): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    
    // 1. 首先按章节分割
    const sections = this.splitBySections(text);
    
    let globalIndex = 0;
    let chunkIndex = 0;
    
    for (const section of sections) {
      // 2. 如果章节太大，按段落进一步分割
      if (section.text.length > this.maxChunkSize) {
        const subChunks = await this.splitByParagraphs(section.text, globalIndex, chunkIndex);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
      } else {
        chunks.push({
          text: section.text,
          metadata: {
            startIndex: globalIndex,
            endIndex: globalIndex + section.text.length,
            chunkIndex: chunkIndex++,
            semanticLevel: 'section',
            title: section.title
          }
        });
      }
      
      globalIndex += section.text.length;
    }
    
    return this.addOverlap(chunks);
  }

  private splitBySections(text: string): Array<{text: string, title?: string}> {
    // 检测章节标题模式
    const sectionPatterns = [
      /^第[一二三四五六七八九十\d]+章.*/gm,
      /^Chapter \d+.*/gm,
      /^# .*/gm,
      /^\d+\.\s+.*/gm,
      /^[A-Z][^.!?]*$/gm
    ];
    
    let sections: Array<{text: string, title?: string}> = [];
    let currentSection = "";
    let currentTitle: string | undefined;
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      const isTitle = sectionPatterns.some(pattern => pattern.test(line.trim()));
      
      if (isTitle && currentSection.length > this.minChunkSize) {
        sections.push({
          text: currentSection.trim(),
          title: currentTitle
        });
        currentSection = "";
        currentTitle = line.trim();
      }
      
      currentSection += line + '\n';
    }
    
    // 添加最后一个章节
    if (currentSection.trim()) {
      sections.push({
        text: currentSection.trim(),
        title: currentTitle
      });
    }
    
    return sections.length > 0 ? sections : [{text: text}];
  }

  private async splitByParagraphs(text: string, startIndex: number, startChunkIndex: number): Promise<TextChunk[]> {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    const chunks: TextChunk[] = [];
    
    let currentChunk = "";
    let currentStartIndex = startIndex;
    let chunkIndex = startChunkIndex;
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > this.maxChunkSize && currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            startIndex: currentStartIndex,
            endIndex: currentStartIndex + currentChunk.length,
            chunkIndex: chunkIndex++,
            semanticLevel: 'paragraph'
          }
        });
        
        currentStartIndex += currentChunk.length;
        currentChunk = "";
      }
      
      currentChunk += paragraph + '\n\n';
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          startIndex: currentStartIndex,
          endIndex: currentStartIndex + currentChunk.length,
          chunkIndex: chunkIndex,
          semanticLevel: 'paragraph'
        }
      });
    }
    
    return chunks;
  }

  private addOverlap(chunks: TextChunk[]): TextChunk[] {
    if (chunks.length <= 1) return chunks;
    
    const overlappedChunks: TextChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      let chunkText = chunks[i].text;
      
      // 添加前向重叠
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.text.slice(-this.overlapSize);
        chunkText = `...${overlapText}\n\n${chunkText}`;
      }
      
      // 添加后向重叠
      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const overlapText = nextChunk.text.slice(0, this.overlapSize);
        chunkText = `${chunkText}\n\n${overlapText}...`;
      }
      
      overlappedChunks.push({
        ...chunks[i],
        text: chunkText
      });
    }
    
    return overlappedChunks;
  }
}

/**
 * 滑动窗口分块策略 - 适用于连续性强的文本
 */
export class SlidingWindowStrategy implements ChunkingStrategy {
  name = "sliding-window";
  
  constructor(
    private windowSize: number = 4000,
    private stepSize: number = 3000
  ) {}

  async chunk(text: string): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    
    for (let i = 0; i < text.length; i += this.stepSize) {
      const chunkText = text.slice(i, i + this.windowSize);
      
      if (chunkText.trim()) {
        chunks.push({
          text: chunkText,
          metadata: {
            startIndex: i,
            endIndex: Math.min(i + this.windowSize, text.length),
            chunkIndex: chunkIndex++
          }
        });
      }
      
      // 如果剩余文本小于窗口大小，直接处理完毕
      if (i + this.windowSize >= text.length) break;
    }
    
    return chunks;
  }
}

/**
 * 自适应分块策略 - 根据文档类型和长度自动选择最佳策略
 */
export class AdaptiveChunkingStrategy implements ChunkingStrategy {
  name = "adaptive";
  
  private semanticStrategy = new SemanticChunkingStrategy();
  private slidingStrategy = new SlidingWindowStrategy();
  
  async chunk(text: string, metadata?: any): Promise<TextChunk[]> {
    const textLength = text.length;
    const hasStructure = this.detectStructure(text);
    
    // 根据文档特征选择策略
    if (hasStructure && textLength > 10000) {
      console.log("使用语义分块策略");
      return this.semanticStrategy.chunk(text);
    } else if (textLength > 50000) {
      console.log("使用滑动窗口策略");
      return this.slidingStrategy.chunk(text);
    } else {
      // 短文档直接使用简单分块
      console.log("使用简单分块策略");
      return this.simpleChunk(text);
    }
  }
  
  private detectStructure(text: string): boolean {
    const structurePatterns = [
      /^第[一二三四五六七八九十\d]+章/gm,
      /^Chapter \d+/gm,
      /^# /gm,
      /^\d+\.\s+/gm
    ];
    
    return structurePatterns.some(pattern => 
      (text.match(pattern) || []).length >= 2
    );
  }
  
  private async simpleChunk(text: string): Promise<TextChunk[]> {
    const maxSize = 4000;
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    
    for (let i = 0; i < text.length; i += maxSize) {
      const chunkText = text.slice(i, i + maxSize);
      chunks.push({
        text: chunkText,
        metadata: {
          startIndex: i,
          endIndex: Math.min(i + maxSize, text.length),
          chunkIndex: chunkIndex++
        }
      });
    }
    
    return chunks;
  }
}