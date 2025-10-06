"use client";

import { useState, useEffect } from "react";
import { Chunk } from "@/lib/summarize";
import SummaryContent from "./ui/summary-content";
import ProgressIndicator from "./ProgressIndicator";

interface ProgressiveSummaryProps {
  chunks: Chunk[];
  onComplete: (summarizedChunks: Chunk[], quickSummary: {title: string, summary: string}) => void;
  language: string;
}

export default function ProgressiveSummary({ 
  chunks, 
  onComplete, 
  language 
}: ProgressiveSummaryProps) {
  const [processedChunks, setProcessedChunks] = useState<Chunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [currentTask, setCurrentTask] = useState("");
  const [quickSummary, setQuickSummary] = useState<{title: string, summary: string} | null>(null);

  useEffect(() => {
    processChunksProgressively();
  }, []);

  const processChunksProgressively = async () => {
    const { getAvailableProvider } = await import('../lib/ai-config');
    const provider = getAvailableProvider();
    
    const batchSize = 3; // 每批处理3个chunk
    const summarizedChunks: Chunk[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      setCurrentTask(`正在处理第 ${i + 1}-${Math.min(i + batchSize, chunks.length)} 部分`);
      
      // 并行处理当前批次
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const data = await provider.generateSummary(chunk.text, language);
          return {
            ...chunk,
            summary: data.summary,
            title: data.title,
          };
        } catch (error) {
          console.log(`处理chunk ${globalIndex} 失败:`, error);
          // 降级处理
          return {
            ...chunk,
            summary: `<p>${chunk.text.slice(0, 200)}...</p>`,
            title: `第${globalIndex + 1}部分`,
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      summarizedChunks.push(...batchResults);
      
      // 更新进度
      setProcessedChunks([...summarizedChunks]);
      setCurrentChunkIndex(summarizedChunks.length);
      
      // 添加小延迟，避免API限制
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 生成快速摘要
    setCurrentTask("生成整体摘要");
    try {
      const allSummaries = summarizedChunks.map(chunk => chunk.summary).join("\n\n");
      const quickSummaryData = await provider.generateSummary(allSummaries, language);
      setQuickSummary(quickSummaryData);
    } catch (error) {
      console.log("快速摘要生成失败:", error);
      setQuickSummary({
        title: "文档摘要",
        summary: `<p>本文档包含 ${summarizedChunks.length} 个主要部分。</p>`
      });
    }
    
    setIsProcessing(false);
    setCurrentTask("");
    
    // 通知父组件处理完成
    onComplete(summarizedChunks, quickSummary || {
      title: "文档摘要",
      summary: `<p>本文档包含 ${summarizedChunks.length} 个主要部分。</p>`
    });
  };

  return (
    <div className="space-y-6">
      {/* 进度指示器 */}
      <ProgressIndicator
        total={chunks.length}
        completed={currentChunkIndex}
        currentTask={currentTask}
        isProcessing={isProcessing}
      />
      
      {/* 快速摘要（如果已生成） */}
      {quickSummary && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 整体摘要</h3>
          <SummaryContent
            title={quickSummary.title}
            summary={quickSummary.summary}
          />
        </div>
      )}
      
      {/* 已处理的章节预览 */}
      {processedChunks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            📚 章节摘要 ({processedChunks.length}/{chunks.length})
          </h3>
          
          <div className="grid gap-4 max-h-96 overflow-y-auto">
            {processedChunks.map((chunk, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 text-sm">
                    {chunk.title || `第${index + 1}部分`}
                  </h4>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div 
                    className="line-clamp-3"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {chunk.summary?.replace(/<[^>]*>/g, '').slice(0, 150) + '...' || ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 处理状态 */}
      {isProcessing && (
        <div className="text-center text-gray-600 text-sm">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            正在智能分析文档内容...
          </div>
        </div>
      )}
    </div>
  );
}