export interface LanguageConfig {
  code: string;
  label: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  tokenRatio: number; // 字符到token的估算比例
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'chinese',
    label: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    tokenRatio: 1.5 // 中文约1.5字符/token
  },
  {
    code: 'english',
    label: 'English',
    nativeName: 'English',
    direction: 'ltr',
    tokenRatio: 4 // 英文约4字符/token
  },
  {
    code: 'japanese',
    label: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    tokenRatio: 2
  },
  {
    code: 'korean',
    label: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    tokenRatio: 2.5
  },
  {
    code: 'spanish',
    label: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    tokenRatio: 4.5
  },
  {
    code: 'french',
    label: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    tokenRatio: 4.2
  },
  {
    code: 'german',
    label: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    tokenRatio: 3.8
  },
  {
    code: 'italian',
    label: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    tokenRatio: 4.3
  },
  {
    code: 'portuguese',
    label: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    tokenRatio: 4.4
  },
  {
    code: 'russian',
    label: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    tokenRatio: 3.2
  },
  {
    code: 'arabic',
    label: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    tokenRatio: 3.5
  },
  {
    code: 'hindi',
    label: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    tokenRatio: 2.8
  },
  {
    code: 'thai',
    label: 'Thai',
    nativeName: 'ไทย',
    direction: 'ltr',
    tokenRatio: 2.2
  }
];

export const getLanguageConfig = (code: string): LanguageConfig | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getLanguageDisplayName = (code: string): string => {
  const config = getLanguageConfig(code);
  return config ? `${config.nativeName} (${config.label})` : code;
};

export const getTokenRatio = (languageCode: string): number => {
  const config = getLanguageConfig(languageCode);
  return config?.tokenRatio || 3.0; // 默认比例
};

// 语言特定的提示词模板
export const getLanguagePrompts = (languageCode: string) => {
  const config = getLanguageConfig(languageCode);
  const nativeName = config?.nativeName || languageCode;
  
  const prompts = {
    chinese: {
      instruction: "请使用简体中文进行分析和摘要。",
      greeting: "你好！我将为您生成中文摘要。",
      summary: "摘要",
      keyPoints: "关键要点",
      conclusion: "结论"
    },
    japanese: {
      instruction: "日本語で分析と要約を行ってください。",
      greeting: "こんにちは！日本語で要約を生成いたします。",
      summary: "要約",
      keyPoints: "重要なポイント",
      conclusion: "結論"
    },
    korean: {
      instruction: "한국어로 분석과 요약을 해주세요.",
      greeting: "안녕하세요! 한국어로 요약을 생성하겠습니다.",
      summary: "요약",
      keyPoints: "주요 포인트",
      conclusion: "결론"
    },
    english: {
      instruction: "Please provide analysis and summary in English.",
      greeting: "Hello! I will generate an English summary for you.",
      summary: "Summary",
      keyPoints: "Key Points",
      conclusion: "Conclusion"
    },
    arabic: {
      instruction: "يرجى تقديم التحليل والملخص باللغة العربية.",
      greeting: "مرحباً! سأقوم بإنشاء ملخص باللغة العربية لك.",
      summary: "الملخص",
      keyPoints: "النقاط الرئيسية",
      conclusion: "الخلاصة"
    }
  };
  
  return prompts[languageCode as keyof typeof prompts] || prompts.english;
};