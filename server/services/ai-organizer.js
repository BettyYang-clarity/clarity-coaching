const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Organize quick capture notes into a structured coaching session record
 * Follows the Clarity Coaching AI Prompt v1 template exactly
 */
async function organizeCapture(capture, clientData, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  // Build input section from capture data
  const inputSection = [
    `Client ID: ${capture.client_id || '未提供'}`,
    `Session date: ${capture.session_date}`,
    `Session number: ${capture.session_no || '未記錄'}`,
    `Consent status: ${capture.recording_consent || 'not_asked'}`,
    '',
    'Quick notes:',
    `主題 / Topic: ${capture.main_topic || '未記錄'}`,
    `今日目標 / Goal: ${capture.goal_today || '未記錄'}`,
    `關鍵字 / Keywords: ${capture.keywords || '未記錄'}`,
    `情緒變化 / Emotion shift: ${capture.emotion_shift || '未記錄'}`,
    `模式 / Pattern noticed: ${capture.pattern_noticed || '未記錄'}`,
    `使用工具 / Tool used: ${capture.tool_used || '未記錄'}`,
    `客戶洞察 / Client insight: ${capture.client_insight || '未記錄'}`,
    `討論行動 / Action discussed: ${capture.action_discussed || '未記錄'}`,
    `後續問題 / Follow-up: ${capture.followup_question || '未記錄'}`,
    `教練備忘 / Coach memo: ${capture.coach_memo || '未記錄'}`,
  ];

  if (capture.raw_transcript) {
    inputSection.push('', 'Approved transcript:', capture.raw_transcript);
  }

  // Add client context if available
  let clientContext = '';
  if (clientData) {
    clientContext = `
Client context (for reference only, do not repeat in output):
- Name: ${clientData.preferred_name}
- Coaching purpose: ${clientData.coaching_purpose || 'N/A'}
- MBTI: ${clientData.mbti_type || 'unknown'} (${clientData.mbti_source || 'unknown'})
- Current focus: ${clientData.current_focus || 'N/A'}
- Previous topic: ${clientData.latest_topic || 'N/A'}
- Previous insight: ${clientData.latest_insight || 'N/A'}
- Previous pattern: ${clientData.latest_pattern || 'N/A'}
`;
  }

  const prompt = `
You are a private coaching documentation assistant. The coach makes all final decisions. Your role is to organize, summarize, identify possible patterns, challenge assumptions, and suggest follow-up questions.

Use GROW as the primary framework:
- Goal / 目標
- Reality / 現況
- Options / 選項
- Will / 行動

Other tools may be used when explicitly identified: MBTI reflection, CBT-based questioning, NLP, positive psychology, boundary exploration, hypnosis, tarot or symbolic reflection.

## Privacy and scope rules

1. Use the client ID provided. Do not infer or recreate identifying information.
2. Keep private coach observations separate from the client-facing summary.
3. Distinguish clearly between: client statements, observable facts, coach observations, interpretations, hypotheses, suggestions, and client-agreed actions.
4. Do not invent missing information. Mark it as "未記錄/not recorded", "不清楚/unclear", or "需要確認/requires confirmation".
5. Do not diagnose the client or present a possible root cause as fact.
6. MBTI is a reflection tool, not a diagnosis or fixed explanation of behavior.
7. Treat all tools as coaching or reflective tools only, within the coach's training and scope.
8. If the material suggests that medical or psychological support may be appropriate, create a cautious referral consideration for the coach to review. Do not make the referral decision automatically.
9. Suggestions are not actions unless the client explicitly agreed to them.

## Output format

Return a JSON object with the following structure. All text content should be bilingual (繁體中文 + English) where helpful:

{
  "dashboard": {
    "client_id": "string",
    "date": "string",
    "session_no": number,
    "main_topic": "string (bilingual)",
    "goal": "string (bilingual)",
    "grow_status": "complete | partial | unclear",
    "key_insight": "string (bilingual)",
    "pattern": "string (bilingual)",
    "method": "string",
    "client_agreed_action": "string (bilingual)",
    "next_focus": "string (bilingual)",
    "referral_flag": "none | coach_review | consider_referral"
  },
  "private_record": {
    "client_statements": "string - important wording as close to the source as possible",
    "facts_context": "string - only information supported by the input",
    "grow_analysis": {
      "goal": "string - state if unclear or incomplete",
      "reality": "string - state if unclear or incomplete",
      "options": "string - state if unclear or incomplete",
      "will": "string - state if unclear or incomplete"
    },
    "issues_triggers": "string",
    "patterns": "string - for every possible pattern, include evidence, what is uncertain, and a validation question",
    "blind_spots": "string - max 3, phrased as possibilities not conclusions",
    "underlying_factors": "string - alternative hypotheses rather than one definitive root cause",
    "method_review": "string - for each method: purpose, how applied, client response, observed result, suggested follow-up",
    "coach_reflection": {
      "noticed": "string - what I noticed",
      "assumed": "string - what I may have assumed",
      "missed": "string - what I may have missed",
      "bias": "string - possible coach bias or blind spot",
      "question_to_revisit": "string"
    }
  },
  "action_plan": {
    "main_insight": "string (bilingual, client-appropriate)",
    "agreed_actions": [
      {
        "action": "string",
        "due_date": "string or null",
        "success_indicator": "string",
        "possible_obstacle": "string",
        "support_needed": "string"
      }
    ]
  },
  "follow_up_questions": ["string - 3 to 5 open questions, prioritizing clarification, pattern testing, and client ownership"],
  "referral_consideration": {
    "status": "none | coach_review | consider_professional_support",
    "reason": "string - observable reason briefly, without diagnosis"
  },
  "client_summary": "string - appropriate shareable summary for the client, NO private hypotheses or sensitive observations"
}
${clientContext}

## Input

${inputSection.join('\n')}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch (parseError) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    throw new Error('AI 回應格式錯誤，無法解析 JSON');
  }
}

module.exports = { organizeCapture };
