import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface ClassificationResult {
  category: string;
  tags: string[];
  summary: string;
}

export const geminiService = {
  /**
   * Tool 1: Image Analysis to Prompt
   */
  async analyzeImageToPrompt(base64Image: string, mimeType: string): Promise<string> {
    const prompt = `你是一位顶级的AI绘画提示词专家。请根据我提供的参考图，深度分析图片内容，并按照以下结构生成一份极其详细的提示词报告。

【核心指令 - 绝对禁令】：
- 所有的生成结果必须**全中文**。
- **禁止出现任何英文字母、单词或英文符号**（如 8K 改为“超高清”，9:16 改为“九比十六”，Lens 改为“镜头”，Cinematic 改为“电影感”等）。
- 即使是技术参数，也必须使用中文描述。

报告结构要求：
1. 【完整长提示词】：一段直接复制使用的超高质量纯中文长文本。包含拍摄手法、人物属性、场景背景、构图方式、光影细节、色彩基调、画质要求及比例。
2. 【维度拆解】：
   - 核心主体与细节：人物或物体特征的中文描述。
   - 场景与构图：环境及布局的中文描述。
   - 光影与色彩：主色调及光影。
   - 风格与画质：艺术风格及画质参数。
3. 【精简版提示词】：纯中文核心词汇。
4. 【国内工具优化技巧】：针对国内模型的中文使用建议。

请严格遵循 JSON 格式，且内容中不得含有任何英文。`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullPrompt: { type: Type.STRING, description: "完整长提示词" },
              dimensions: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: "核心主体与细节" },
                  scene: { type: Type.STRING, description: "场景与构图" },
                  lighting: { type: Type.STRING, description: "光影与色彩" },
                  style: { type: Type.STRING, description: "风格与画质" }
                },
                required: ["subject", "scene", "lighting", "style"]
              },
              shortPrompt: { type: Type.STRING, description: "精简版提示词" },
              tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "优化技巧" }
            },
            required: ["fullPrompt", "dimensions", "shortPrompt", "tips"]
          }
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      return "算力分析失败，请检查网络或API配置。";
    }
  },

  /**
   * Tool 2: Prompt Classification
   */
  async classifyPrompt(userInput: string): Promise<ClassificationResult> {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [`你是一个数据分类专家。请分析以下提示词内容，并输出其对应的分类和标签。
待处理提示词： ${userInput}`],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING }
            },
            required: ["category", "tags", "summary"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Gemini Classify Error:", e);
      return { category: "Unknown", tags: [], summary: "Failed to parse result." };
    }
  },

  /**
   * Tool 3: Prompt Refinement & Structuring
   */
  async structurePrompt(userPrompt: string): Promise<string> {
    const prompt = `请将用户输入的原始提示词重构为“结构化模板”。
1. 识别其中的关键变量，并用 [变量名] 替换。
2. 增加角色设定（Role）和任务目标（Task）。
3. 确保逻辑清晰，包含“限制条件”和“输出格式”。

原始输入： ${userPrompt}
优化后： (请严格按照 Role, Task, Content, Note 的格式输出)`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [prompt]
      });

      return response.text || "Failed to structure prompt.";
    } catch (error) {
      console.error("Gemini Structure Error:", error);
      return "结构化重组失败。";
    }
  }
};
