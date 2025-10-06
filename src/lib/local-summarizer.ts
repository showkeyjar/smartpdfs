// 本地摘要处理器 - 不依赖外部API

export interface LocalSummaryResult {
  title: string;
  summary: string;
  keywords: string[];
  importance: number;
  contentType: 'introduction' | 'main_content' | 'conclusion' | 'example' | 'reference' | 'acknowledgement';
}

export class LocalSummarizer {
  
  static summarize(text: string, language: string = 'chinese'): LocalSummaryResult {
    // 清理文本
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 分句
    const sentences = cleanText.split(/[.!?。！？\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
    
    // 生成标题
    const title = this.generateTitle(sentences, language);
    
    // 生成摘要
    const summary = this.generateSummary(sentences, language);
    
    // 提取关键词
    const keywords = this.extractKeywords(cleanText, language);
    
    // 评估重要性
    const importance = this.assessImportance(cleanText);
    
    // 确定内容类型
    const contentType = this.determineContentType(cleanText);
    
    return {
      title,
      summary,
      keywords,
      importance,
      contentType
    };
  }
  
  private static generateTitle(sentences: string[], language: string): string {
    if (sentences.length === 0) return "文档摘要";
    
    // 取第一句作为标题基础
    let title = sentences[0];
    
    // 限制长度
    if (title.length > 60) {
      title = title.slice(0, 57) + "...";
    }
    
    return title || (language === 'chinese' ? "文档摘要" : "Document Summary");
  }
  
  private static generateSummary(sentences: string[], language: string): string {
    if (sentences.length === 0) {
      return language === 'chinese' ? 
        "<p>文档内容为空。</p>" : 
        "<p>Document content is empty.</p>";
    }
    
    const isChineseLanguage = ['chinese', '中文'].includes(language.toLowerCase());
    
    // 选择重要句子（前3句 + 中间1句 + 最后1句）
    const importantSentences = [];
    
    // 前3句
    importantSentences.push(...sentences.slice(0, Math.min(3, sentences.length)));
    
    // 中间句子
    if (sentences.length > 6) {
      const midIndex = Math.floor(sentences.length / 2);
      importantSentences.push(sentences[midIndex]);
    }
    
    // 最后一句
    if (sentences.length > 4) {
      importantSentences.push(sentences[sentences.length - 1]);
    }
    
    // 去重
    const uniqueSentences = [...new Set(importantSentences)];
    
    // 构建HTML摘要
    let summary = `<p>${isChineseLanguage ? '本文档主要内容：' : 'Main content:'}</p>`;
    
    if (uniqueSentences.length > 1) {
      summary += '<ul>';
      uniqueSentences.slice(0, 5).forEach(sentence => {
        if (sentence.trim()) {
          summary += `<li>${sentence.trim()}${this.needsPunctuation(sentence) ? '。' : ''}</li>`;
        }
      });
      summary += '</ul>';
    } else {
      summary += `<p>${uniqueSentences[0] || sentences[0]}</p>`;
    }
    
    // 添加统计信息
    summary += `<p><small>${isChineseLanguage ? 
      `文档包含约 ${sentences.length} 个句子，${sentences.join('').length} 个字符。` :
      `Document contains approximately ${sentences.length} sentences, ${sentences.join('').length} characters.`
    }</small></p>`;
    
    return summary;
  }
  
  private static extractKeywords(text: string, language: string): string[] {
    const isChineseLanguage = ['chinese', '中文'].includes(language.toLowerCase());
    
    // 简单的关键词提取
    const words = text.split(/[\s\p{P}]+/u)
      .map(w => w.trim())
      .filter(w => w.length > (isChineseLanguage ? 1 : 3));
    
    // 词频统计
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordCount.set(lowerWord, (wordCount.get(lowerWord) || 0) + 1);
    });
    
    // 排序并取前几个
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
    
    // 如果关键词太少，添加一些默认词
    if (sortedWords.length < 3) {
      const defaultKeywords = isChineseLanguage ? 
        ['文档', '内容', '信息'] : 
        ['document', 'content', 'information'];
      
      sortedWords.push(...defaultKeywords.slice(0, 3 - sortedWords.length));
    }
    
    return sortedWords.slice(0, 6);
  }
  
  private static assessImportance(text: string): number {
    // 基于文本长度和内容特征评估重要性
    const length = text.length;
    
    // 长度因子
    let importance = Math.min(length / 1000, 0.5);
    
    // 关键词因子
    const importantKeywords = [
      '重要', '关键', '核心', '主要', '结论', '总结',
      'important', 'key', 'core', 'main', 'conclusion', 'summary'
    ];
    
    const hasImportantKeywords = importantKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    if (hasImportantKeywords) {
      importance += 0.3;
    }
    
    // 数字和公式因子
    if (/\d+/.test(text) || /[=+\-*/]/.test(text)) {
      importance += 0.1;
    }
    
    return Math.min(Math.max(importance, 0.1), 1.0);
  }
  
  private static determineContentType(text: string): LocalSummaryResult['contentType'] {
    const lowerText = text.toLowerCase();
    
    // 致谢内容
    if (lowerText.includes('感谢') || lowerText.includes('致谢') || 
        lowerText.includes('thank') || lowerText.includes('acknowledge')) {
      return 'acknowledgement';
    }
    
    // 介绍内容
    if (lowerText.includes('介绍') || lowerText.includes('引言') || 
        lowerText.includes('introduction') || lowerText.includes('overview')) {
      return 'introduction';
    }
    
    // 结论内容
    if (lowerText.includes('结论') || lowerText.includes('总结') || 
        lowerText.includes('conclusion') || lowerText.includes('summary')) {
      return 'conclusion';
    }
    
    // 示例内容
    if (lowerText.includes('例如') || lowerText.includes('示例') || 
        lowerText.includes('example') || lowerText.includes('instance')) {
      return 'example';
    }
    
    // 参考内容
    if (lowerText.includes('参考') || lowerText.includes('引用') || 
        lowerText.includes('reference') || lowerText.includes('citation')) {
      return 'reference';
    }
    
    // 默认为主要内容
    return 'main_content';
  }
  
  private static needsPunctuation(sentence: string): boolean {
    const lastChar = sentence.trim().slice(-1);
    return !['。', '.', '!', '！', '?', '？'].includes(lastChar);
  }
}