# SmartPDF 快速启动指南

## 🚀 30秒极速启动

### 零配置版本（推荐新手）
```bash
# 克隆项目
git clone https://github.com/Nutlope/smartpdfs
cd smartpdfs

# 安装依赖并启动
pnpm install && pnpm dev
```

访问 `http://localhost:3000` 立即开始使用！

### 增强版本（AI摘要）
```bash
# 1. 基础安装（同上）
pnpm install

# 2. 配置AI服务（可选）
echo "TOGETHER_API_KEY=your_api_key_here" > .env

# 3. 启动
pnpm dev
```

## 🎯 两种使用模式

### 📱 基础模式（无需配置）
- ✅ 立即可用，无需任何设置
- ✅ 本地文本分析和摘要
- ✅ 支持大型PDF文件
- ✅ 多语言界面
- ✅ 完全离线工作
- ⚠️ 摘要质量相对简单

### 🤖 AI增强模式（配置Together AI）
- ✅ 高质量AI摘要
- ✅ 智能内容分析
- ✅ 层次化摘要结构
- ✅ 重要性评分
- ✅ 关键词提取
- 💰 需要API费用（按使用量计费）

## 🎯 主要功能

### 无限制PDF处理
- ✅ 支持任意大小的PDF文件
- ✅ 无页数限制（可处理整本书籍）
- ✅ 智能分块策略

### 多语言支持
- 🇨🇳 中文（默认）
- 🇺🇸 English
- 🇯🇵 日本語
- 🇰🇷 한국어
- 🇪🇸 Español
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇮🇹 Italiano
- 🇵🇹 Português
- 🇷🇺 Русский
- 🇸🇦 العربية
- 🇮🇳 हिन्दी
- 🇹🇭 ไทย

### 智能摘要
- 📊 层次化摘要结构
- 🎯 重要性评分系统
- 🔍 关键词自动提取
- 📝 多级摘要选项

## 🔧 技术架构

### 前端
- Next.js 15 + TypeScript
- Tailwind CSS
- React Hooks

### 后端
- Next.js API Routes
- Prisma ORM
- Neon PostgreSQL

### AI服务
- Together AI (Llama 3.3)
- 智能分块算法
- 上下文管理系统

### 部署优势
- 🚫 无需S3存储
- 🔒 本地PDF处理
- ⚡ 快速部署
- 💰 成本节约

## 📖 使用说明

### 基本使用
1. 上传PDF文件（任意大小）
2. 选择摘要语言
3. 点击"生成智能摘要"
4. 查看层次化摘要结果

### 高级功能
- **大文档模式**: 超过50页自动启用增强处理
- **智能分块**: 基于文档结构的语义分割
- **上下文优化**: 解决大文档token限制问题

## 🛠️ 开发指南

### 添加新语言
1. 更新 `src/lib/language-config.ts`
2. 添加语言配置和token比例
3. 更新界面选择器

### 自定义分块策略
1. 实现 `ChunkingStrategy` 接口
2. 在 `src/lib/chunking-strategies.ts` 中添加
3. 在 `AdaptiveChunkingStrategy` 中集成

### API扩展
- `/api/enhanced-summarize` - 增强摘要
- `/api/hierarchical-summary` - 层次化摘要
- `/api/image` - 封面图生成

## 🐛 故障排除

### 常见问题
1. **Together AI API错误**: 检查API密钥是否正确
2. **数据库连接失败**: 验证DATABASE_URL格式
3. **PDF处理失败**: 确保PDF包含可搜索文本

### 性能优化
- 大文档建议使用Chrome浏览器
- 确保网络连接稳定
- 监控API使用量

## 📞 支持

- 🐛 Bug报告: GitHub Issues
- 💡 功能建议: GitHub Discussions
- 📧 技术支持: 项目维护者

---

**享受智能PDF摘要的强大功能！** 🎉