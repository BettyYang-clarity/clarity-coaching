const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Real-time AI coaching assistant
 * Provides suggestions, follow-up questions, method recommendations
 */
async function getAssistantResponse(message, clientContext, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let contextSection = '';
  if (clientContext?.client) {
    const c = clientContext.client;
    contextSection = `
## 客戶脈絡 / Client Context (for reference)
- Client ID: ${c.client_id}
- Coaching purpose: ${c.coaching_purpose || 'N/A'}
- Current focus: ${c.current_focus || 'N/A'}
- Latest topic: ${c.latest_topic || 'N/A'}
- Latest insight: ${c.latest_insight || 'N/A'}
- Latest pattern: ${c.latest_pattern || 'N/A'}
- MBTI: ${c.mbti_type || 'unknown'}
`;

    if (clientContext.recentSessions?.length > 0) {
      contextSection += '\n## 近期會談 / Recent Sessions\n';
      for (const s of clientContext.recentSessions) {
        contextSection += `- ${s.date}: ${s.main_topic || 'N/A'} | Insight: ${s.key_insight || 'N/A'} | Method: ${s.method_used || 'N/A'}\n`;
      }
    }
  }

  const prompt = `
You are a coaching assistant for a professional Clarity Coach. Your role is to provide helpful suggestions, follow-up questions, method recommendations, and coaching perspectives.

## Important rules:
1. All suggestions are advisory only — the coach makes ALL decisions.
2. Use GROW (Goal/Reality/Options/Will) as the primary framework.
3. Respond in 繁體中文 as primary language, keep English coaching terms where standard.
4. Do NOT diagnose clients or present hypotheses as facts.
5. Do NOT create actions unless the coach explicitly asks.
6. Keep responses concise and practical.
7. When suggesting coaching methods, briefly explain why and how to apply them.
8. Available coaching tools: GROW, MBTI reflection, CBT questioning, NLP/reframing, Positive Psychology, Boundary Exploration, Hypnosis, Tarot/Symbolic Reflection.

${contextSection}

## 教練的問題 / Coach's question:
${message}

Please provide a helpful, concise response. Format with clear sections if needed.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { getAssistantResponse };
