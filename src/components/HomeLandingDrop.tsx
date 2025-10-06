"use client";

import { SparklesIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import Dropzone from "react-dropzone";
import HomepageImage1 from "./images/homepage-image-1";
import HomepageImage2 from "./images/homepage-image-2";
import { StatusApp } from "@/app/page";
import { useToast } from "@/hooks/use-toast";

export const HomeLandingDrop = ({
  status,
  file,
  setFile,
  handleSubmit,
}: {
  status: StatusApp;
  file?: File | null;
  setFile: (file: File | null) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) => {
  const { toast } = useToast();
  return (
    <div className="mx-auto mt-6 max-w-lg md:mt-10">
      <h1 className="text-center text-4xl font-bold md:text-5xl">
        智能PDF摘要
        <br /> 秒级生成
      </h1>
      <p className="mx-auto mt-6 max-w-md text-balance text-center leading-snug md:text-lg md:leading-snug">
        上传 <strong>PDF</strong> 文档，获得快速、清晰的智能摘要。
        <br />
        <span className="text-sm text-gray-600 mt-2 block">
          支持大型文档 • 无页数限制 • 多语言摘要 • 本地处理
        </span>
      </p>

      <form
        onSubmit={handleSubmit}
        className="relative mx-auto mt-20 max-w-md px-4 md:mt-16"
      >
        <div className="pointer-events-none absolute left-[-40px] top-[-185px] flex w-[200px] items-center md:-left-[calc(min(30vw,350px))] md:-top-20 md:w-[390px]">
          <HomepageImage1 />
        </div>
        <div className="pointer-events-none absolute right-[20px] top-[-110px] flex w-[70px] justify-center md:-right-[calc(min(30vw,350px))] md:-top-5 md:w-[390px]">
          <HomepageImage2 />
        </div>

        <div className="relative">
          <div className="flex flex-col rounded-xl bg-white px-6 py-6 shadow md:px-12 md:py-8">
            <label className="text-gray-500" htmlFor="file">
              上传PDF文档
            </label>
            <Dropzone
              multiple={false}
              accept={{
                "application/pdf": [".pdf"],
              }}
              onDrop={(acceptedFiles) => {
                const file = acceptedFiles[0];
                // 移除文件大小限制，使用智能分块策略处理大文档
                setFile(file);
              }}
            >
              {({ getRootProps, getInputProps, isDragAccept }) => (
                <div
                  className={`mt-2 flex aspect-video cursor-pointer items-center justify-center rounded-lg border border-dashed bg-gray-100 ${isDragAccept ? "border-blue-500" : "border-gray-250"}`}
                  {...getRootProps()}
                >
                  <input required={!file} {...getInputProps()} />
                  <div className="text-center">
                    {file ? (
                      <p>{file.name}</p>
                    ) : (
                      <Button type="button" className="md:text-base">
                        选择PDF文件
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Dropzone>
            <label className="mt-8 text-gray-500" htmlFor="language">
              摘要语言
            </label>
            <Select defaultValue="chinese" name="language">
              <SelectTrigger className="mt-2 bg-gray-100" id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: "中文 (Chinese)", value: "chinese" },
                  { label: "English", value: "english" },
                  { label: "日本語 (Japanese)", value: "japanese" },
                  { label: "한국어 (Korean)", value: "korean" },
                  { label: "Español (Spanish)", value: "spanish" },
                  { label: "Français (French)", value: "french" },
                  { label: "Deutsch (German)", value: "german" },
                  { label: "Italiano (Italian)", value: "italian" },
                  { label: "Português (Portuguese)", value: "portuguese" },
                  { label: "Русский (Russian)", value: "russian" },
                  { label: "العربية (Arabic)", value: "arabic" },
                  { label: "हिन्दी (Hindi)", value: "hindi" },
                  { label: "ไทย (Thai)", value: "thai" },
                ].map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-8 text-center">
            <Button
              type="submit"
              variant="secondary"
              className="w-60 border bg-white/80 text-base font-semibold hover:bg-white md:w-auto"
              disabled={status === "parsing"}
            >
              <SparklesIcon />
              生成智能摘要
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
