import { PromptTemplate } from "@langchain/core/prompts";

export const lineEditorPrompt = PromptTemplate.fromTemplate(`
Improve the readability, clarity and coherence of the **manuscript**. Output only the corrected text without additional formatting, markdowns, labels or prefixes. If the **manuscript** doesn't require any adjustments, rewrite it as it is.

---

**Manuscript:**

{inputText}
`);