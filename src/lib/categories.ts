export type Category = "cursor" | "chatgpt" | "codex" | "extras";

export interface CategoryMeta {
  slug: Category;
  label: string;
  shortLabel: string;
  description: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  cursor: {
    slug: "cursor",
    label: "Cursor 专题",
    shortLabel: "Cursor",
    description:
      "Cursor 专题：涵盖 Cursor 的套餐与模型选择、Agent 与安全审批机制、GitHub Pages 建站与自定义域名、SSH 远程开发、阿里云 ECS 部署 Web 应用、全栈小应用实战，以及用 Cursor Agent 辅助排查 Windows 系统故障等工程化实战内容。",
  },
  chatgpt: {
    slug: "chatgpt",
    label: "ChatGPT / OpenAI API",
    shortLabel: "ChatGPT",
    description:
      "ChatGPT / OpenAI API 专题：介绍 ChatGPT 个人订阅方案（Free / Go / Plus / Pro）的选择与账单管理方法，以及 OpenAI API 的接入方式、密钥安全管理与成本控制技巧，帮助你分清两套独立计费产品并按需选用。",
  },
  codex: {
    slug: "codex",
    label: "OpenAI Codex 专题",
    shortLabel: "Codex",
    description:
      "OpenAI Codex 专题：介绍 OpenAI Codex 的产品入口与登录方式、CLI 命令行上手步骤、工程化工作流设计、定制配置技巧，以及接入 DeepSeek 等第三方模型的实践方法，帮助你把 Codex 真正用进日常研发流程和团队协作场景中。",
  },
  extras: {
    slug: "extras",
    label: "扩展与部署",
    shortLabel: "Extras",
    description:
      "扩展与部署专题：收录与 AI 编程主线相关的扩展实践内容，包括自建访问统计服务的部署步骤与性能优化方法，以及使用 Tailscale 在没有公网 IP 的情况下安全远程访问 ESXi 管理界面等实战案例，适合有一定运维基础的读者延伸阅读。",
  },
};

export const CATEGORY_ORDER: Category[] = ["cursor", "chatgpt", "codex", "extras"];
