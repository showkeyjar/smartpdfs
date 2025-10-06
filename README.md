<a href="https://github.com/Nutlope/smartpdfs">
  <img alt="SmartPDF" src="./public/og.jpg">
  <h1 align="center">SmartPDF</h1>
</a>

<p align="center">
  Instantly summarize and section your PDFs with AI. Powered by Llama 3.3 on Together AI.
</p>

## Tech stack

- Next.js with Tailwind & TypeScript
- 本地PDF处理（无需外部存储）
- [Together AI](https://togetherai.link) (可选 - 用于AI摘要)
- [Llama 3.3](https://togetherai.link/llama-3.3) (可选 - 高质量摘要)
- 本地摘要算法（备用方案）

## 🚀 快速开始

### 基础版本（无需任何配置）
```bash
# 克隆项目
git clone https://github.com/Nutlope/smartpdfs
cd smartpdfs

# 安装依赖
pnpm install

# 直接启动（使用本地摘要功能）
pnpm dev
```

### 增强版本（配置AI服务）
```bash
# 1. 创建 .env 文件
cp .env.example .env

# 2. 编辑 .env 文件，添加 Together AI API 密钥（可选）
TOGETHER_API_KEY=your_together_ai_api_key_here

# 3. 启动应用
pnpm dev
```

访问 `http://localhost:3000` 开始使用！

## 🚀 最新优化功能

### 🔥 无限制处理能力
- **移除文件大小限制**: 支持任意大小的PDF文档
- **无页数限制**: 可处理数百页的大型文档（如整本书籍）
- **智能处理策略**: 大文档自动使用增强模式，小文档使用快速模式

### 🌍 多语言支持
- **13种语言**: 中文、英文、日语、韩语、西班牙语、法语、德语、意大利语、葡萄牙语、俄语、阿拉伯语、印地语、泰语
- **中文优化**: 默认中文界面，针对中文文档优化处理
- **语言特定优化**: 每种语言都有专门的token估算和处理策略

### 🧠 智能分块策略
- **语义感知分块**: 基于章节和段落结构的智能分割
- **滑动窗口分块**: 适用于连续性强的文本
- **自适应分块**: 根据文档类型自动选择最佳策略

### 📊 增强摘要系统
- **层次化摘要**: 整体摘要 + 章节摘要 + 关键要点
- **重要性评分**: AI自动评估内容重要性(0-1分)
- **多级摘要**: 简洁/平衡/详细三种摘要级别
- **关键词提取**: 自动提取3-8个核心关键词

### 🎯 智能上下文管理
- **上下文窗口优化**: 解决大文档token限制问题
- **相关性匹配**: 基于查询智能选择相关片段
- **任务特定上下文**: 针对摘要/问答/分析等不同任务优化

### 🔧 新增API端点
- `/api/enhanced-summarize` - 增强摘要生成
- `/api/hierarchical-summary` - 层次化摘要生成

## 使用示例

```typescript
import { summarizeIntelligent, chunkPdfEnhanced } from '@/lib/summarize';
import { ContextManager } from '@/lib/context-manager';

// 智能摘要（推荐用于大文档）
const result = await summarizeIntelligent(pdf, "中文", "detailed");

// 手动控制分块和摘要
const chunks = await chunkPdfEnhanced(pdf);
const contextManager = new ContextManager();
const context = await contextManager.createTaskSpecificContext(chunks, 'summarize', '中文');
```

## Roadmap

### ✅ 已完成
- [x] 智能分块策略系统
- [x] 增强摘要生成
- [x] 层次化摘要结构
- [x] 上下文管理器
- [x] 重要性评分系统
- [x] 移除PDF大小和页数限制
- [x] 13种语言支持
- [x] 中文界面优化
- [x] 大文档智能处理模式
- [x] 移除S3依赖，本地PDF处理
- [x] 移除数据库依赖，完全本地化
- [x] 可选AI服务，支持离线使用
- [x] 零配置启动
- [x] 多重错误恢复机制
- [x] 自动降级处理
- [x] 本地摘要引擎
- [x] 零故障运行保证
- [x] 渐进式处理显示
- [x] 实时进度指示器
- [x] 批量并行处理优化

### 🔄 进行中
- [ ] Add some rate limiting by IP address
- [ ] Integrate OCR for image parsing in PDFs
- [ ] Add a bit more polish (make the link icon nicer) & add a "powered by Together" sign
- [ ] Add feedback system with thumbs up/down feature

### 📋 计划中
- [ ] 向量化搜索集成
- [ ] 多模态内容处理（图表、表格）
- [ ] 实时协作摘要
- [ ] 自定义摘要模板
- [ ] 批量文档处理

## 🔧 技术优势

### 🚀 零依赖启动
- **无需数据库**: 所有数据本地处理，无需配置数据库
- **无需外部存储**: PDF文件在浏览器本地处理
- **可选AI服务**: 不配置API也能基础使用
- **一键启动**: `pnpm install && pnpm dev` 即可运行

### 🔒 隐私安全
- **完全本地**: PDF文件不离开用户设备
- **无数据收集**: 不存储任何用户文档或摘要
- **离线可用**: 基础功能支持离线使用
- **开源透明**: 所有代码公开可审计

### ⚡ 性能优化
- **自适应处理**: 根据PDF大小自动选择最佳策略
- **多语言优化**: 每种语言专门的处理策略
- **智能分块**: 大文档并行处理
- **渐进增强**: AI服务可用时自动启用高级功能

### 🎯 使用模式

#### 基础模式（无需配置）
- 本地文本分析和简单摘要
- 支持所有PDF处理功能
- 多语言界面
- 完全离线可用

#### 增强模式（配置Together AI）
- AI驱动的智能摘要
- 高质量内容分析
- 层次化摘要结构
- 重要性评分系统
- [ ] 自定义摘要模板
- [ ] 批量文档处理
