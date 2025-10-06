"use client";

import { useEffect, useState } from "react";

interface ProgressIndicatorProps {
  total: number;
  completed: number;
  currentTask?: string;
  isProcessing: boolean;
}

export default function ProgressIndicator({ 
  total, 
  completed, 
  currentTask, 
  isProcessing 
}: ProgressIndicatorProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isProcessing) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          处理进度
        </span>
        <span className="text-sm text-gray-500">
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      
      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* 当前任务 */}
      {currentTask && (
        <div className="text-xs text-gray-600 flex items-center">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
          {currentTask}{dots}
        </div>
      )}
      
      {/* 完成状态 */}
      {!isProcessing && completed === total && (
        <div className="text-xs text-green-600 flex items-center">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2" />
          处理完成！
        </div>
      )}
    </div>
  );
}