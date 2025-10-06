"use client";

// 移除S3上传依赖，改为本地处理
import { Button } from "@/components/ui/button";
import {
  Chunk,
  chunkPdf,
  generateQuickSummary,
  summarizeStream,
} from "@/lib/summarize";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { FormEvent, useState } from "react";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { MenuIcon, SquareArrowOutUpRight } from "lucide-react";
import ActionButton from "@/components/ui/action-button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { HomeLandingDrop } from "@/components/HomeLandingDrop";
import SummaryContent from "@/components/ui/summary-content";
import TableOfContents from "@/components/ui/table-of-contents";
import AIStatusBadge from "@/components/AIStatusBadge";
import ProgressiveSummary from "@/components/ProgressiveSummary";

export type StatusApp = "idle" | "parsing" | "generating" | "progressive";

export default function Home() {
  const [status, setStatus] = useState<StatusApp>("idle");
  const [file, setFile] = useState<File>();
  const [fileUrl, setFileUrl] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<
    number | "quick-summary" | null
  >(null);
  const [quickSummary, setQuickSummary] = useState<{
    title: string;
    summary: string;
  }>();
  // 移除图片生成功能
  const [showMobileContents, setShowMobileContents] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("chinese");
  // 不再需要S3上传

  const { toast } = useToast();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const language = new FormData(e.currentTarget).get("language");

    if (!file || typeof language !== "string") return;
    
    setSelectedLanguage(language);

    setStatus("parsing");

    // 生成本地PDF URL用于显示
    const localPdfUrl = URL.createObjectURL(file);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    // 使用智能分块策略处理大文档，无页数限制
    console.log(`处理PDF: ${pdf.numPages} 页`);
    
    // 根据文档大小选择处理策略
    const useProgressiveProcessing = pdf.numPages > 20; // 降低阈值，更多文档使用渐进式处理
    
    if (useProgressiveProcessing) {
      console.log("使用渐进式处理模式（大文档）");
      
      // 使用基础分块，然后渐进式处理
      const localChunks = await chunkPdf(pdf);
      setChunks(localChunks);
      setFileUrl(localPdfUrl);
      setStatus("progressive"); // 设置为渐进式处理状态
      
      return;
    }
    
    // 传统处理模式（小文档）
    const localChunks = await chunkPdf(pdf);
    const totalText = localChunks.reduce(
      (acc, chunk) => acc + chunk.text.length,
      0,
    );

    if (totalText < 500) {
      toast({
        variant: "destructive",
        title: "无法处理PDF",
        description:
          "该PDF似乎是扫描文档或包含的可搜索文本太少。请确保PDF包含可搜索的文本。",
      });
      setFile(undefined);
      setStatus("idle");
      return;
    }

    setChunks(localChunks);
    setStatus("generating");

    const summarizedChunks: Chunk[] = [];

    const writeStream = new WritableStream({
      write(chunk) {
        summarizedChunks.push(chunk);
        setChunks((chunks) => {
          return chunks.map((c) =>
            c.text === chunk.text ? { ...c, ...chunk } : c,
          );
        });
      },
    });

    const stream = await summarizeStream(localChunks, language);
    const controller = new AbortController();
    await stream.pipeTo(writeStream, { signal: controller.signal });

    const quickSummary = await generateQuickSummary(summarizedChunks, language);

    setQuickSummary(quickSummary);
    setFileUrl(localPdfUrl);

    setActiveChunkIndex((activeChunkIndex) =>
      activeChunkIndex === null ? "quick-summary" : activeChunkIndex,
    );

    // 本地存储摘要结果（可选）
    const summaryData = {
      pdfName: file.name,
      timestamp: new Date().toISOString(),
      summary: quickSummary.summary,
      chunks: summarizedChunks
    };
    
    // 保存到localStorage（可选功能）
    try {
      localStorage.setItem(`pdf-summary-${Date.now()}`, JSON.stringify(summaryData));
    } catch (e) {
      console.log("无法保存到本地存储:", e);
    }
  }

  // 处理渐进式摘要完成
  const handleProgressiveComplete = (summarizedChunks: Chunk[], quickSummaryData: {title: string, summary: string}) => {
    setChunks(summarizedChunks);
    setQuickSummary(quickSummaryData);
    setStatus("generating"); // 切换到正常显示模式
    setActiveChunkIndex("quick-summary");
    
    // 本地存储摘要结果（可选）
    const summaryData = {
      pdfName: file?.name || "document",
      timestamp: new Date().toISOString(),
      summary: quickSummaryData.summary,
      chunks: summarizedChunks
    };
    
    try {
      localStorage.setItem(`pdf-summary-${Date.now()}`, JSON.stringify(summaryData));
    } catch (e) {
      console.log("无法保存到本地存储:", e);
    }
  };

  return (
    <div>
      {status === "idle" || status === "parsing" ? (
        <HomeLandingDrop
          status={status}
          file={file}
          setFile={(file) => file && setFile(file)}
          handleSubmit={handleSubmit}
        />
      ) : status === "progressive" ? (
        <div className="mt-6 px-4 md:mt-10">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between rounded-lg border border-gray-250 px-4 py-2 md:px-6 md:py-3 mb-6">
              <div className="inline-flex items-center gap-4">
                <p className="md:text-lg">{file?.name}</p>
                <AIStatusBadge />
              </div>
              <div className="flex flex-row gap-2">
                {fileUrl && (
                  <Link href={fileUrl} target="_blank">
                    <ActionButton>
                      <SquareArrowOutUpRight size={14} />
                      <span>查看原PDF</span>
                    </ActionButton>
                  </Link>
                )}
              </div>
            </div>
            
            <ProgressiveSummary
              chunks={chunks}
              onComplete={handleProgressiveComplete}
              language={selectedLanguage}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 px-4 md:mt-10">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between rounded-lg border border-gray-250 px-4 py-2 md:px-6 md:py-3">
              <div className="inline-flex items-center gap-4">
                <p className="md:text-lg">{file?.name}</p>
                <AIStatusBadge />
              </div>

              <div className="flex flex-row gap-2">
                {fileUrl && (
                  <Link href={fileUrl} target="_blank">
                    <ActionButton>
                      <SquareArrowOutUpRight size={14} />
                      <span>查看原PDF</span>
                    </ActionButton>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-gray-200 px-4 py-2 shadow md:hidden">
              <Button
                onClick={() => setShowMobileContents(!showMobileContents)}
                className="w-full text-gray-500 hover:bg-transparent"
                variant="ghost"
              >
                <MenuIcon />
                {showMobileContents ? "Hide" : "Show"} contents
              </Button>

              {showMobileContents && (
                <div className="mt-4">
                  <TableOfContents
                    activeChunkIndex={activeChunkIndex}
                    setActiveChunkIndex={setActiveChunkIndex}
                    quickSummary={quickSummary}
                    chunks={chunks}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-4">
              <div className="w-full grow rounded-lg bg-white p-5 text-gray-500 shadow">
                {activeChunkIndex === "quick-summary" ? (
                  <SummaryContent
                    title={quickSummary?.title}
                    summary={quickSummary?.summary}
                  />
                ) : activeChunkIndex !== null ? (
                  <SummaryContent
                    title={chunks[activeChunkIndex].title}
                    summary={chunks[activeChunkIndex].summary}
                  />
                ) : (
                  <div className="flex animate-pulse items-center justify-center py-4 text-lg md:py-8">
                    Generating your Smart PDF&hellip;
                  </div>
                )}
              </div>

              <div className="hidden w-full max-w-60 shrink-0 md:flex">
                <TableOfContents
                  activeChunkIndex={activeChunkIndex}
                  setActiveChunkIndex={setActiveChunkIndex}
                  quickSummary={quickSummary}
                  chunks={chunks}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
