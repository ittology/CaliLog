import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AppData, 
  ChatMessage, 
  WorkoutLog, 
  WorkoutPlan, 
  BodyWeightEntry, 
  AiProvider 
} from '../types';

// settings passed to the assistant on every call
export interface AiAssistantSettings {
  providers: AiProvider[];
  primaryModel: string;
  logContextLimit: number;
  planContextLimit: number;
  weightLogLimit: number;
  personalContext?: string;
}

// app data available for tool calls
export interface AiAssistantData {
  history: WorkoutLog[];
  plans: WorkoutPlan[];
  weightLogs: BodyWeightEntry[];
}

// arguments the model can pass to a tool
interface ToolParams {
  limit?: number;
  indices?: number[];
  startDate?: string;
  endDate?: string;
}

export const AiAssistantService = {
  // main entry point: routes to gemini or groq based on the selected model
  sendMessage: async (
    messages: ChatMessage[],
    settings: AiAssistantSettings,
    data: AiAssistantData
  ): Promise<ChatMessage> => {
    const { primaryModel, providers } = settings;
    
    // find which provider has the selected model
    const provider = providers.find(p => p.models.includes(primaryModel));
    
    if (!provider || !provider.apiKey) {
      throw new Error(`No API key found for model "${primaryModel}". Please check your Assistant settings.`);
    }

    const isGemini = provider.name.toLowerCase().includes('google') || primaryModel.toLowerCase().includes('gemini');
    
    if (isGemini) {
      return await callGemini(messages, { ...settings, apiKey: provider.apiKey }, data);
    } else {
      return await callGroq(messages, { ...settings, apiKey: provider.apiKey }, data);
    }
  },
};

// resolves a tool call from either provider and returns the data
function resolveToolCall(name: string, args: ToolParams, data: AiAssistantData, settings: AiAssistantSettings) {
  switch (name) {
    case 'readLogs': {
      const { limit, startDate, endDate } = args;
      let logs = [...data.history];
      
      if (startDate || endDate) {
        logs = logs.filter(l => {
          const date = new Date(l.date);
          if (startDate && date < new Date(startDate)) return false;
          if (endDate && date > new Date(endDate)) return false;
          return true;
        });
      }
      
      const count = Math.min(limit || settings.logContextLimit, settings.logContextLimit);
      return logs.slice(0, count).reverse(); // return oldest first for AI context
    }

    case 'readPlans': {
      const limit = Math.min(args.limit || settings.planContextLimit, settings.planContextLimit);
      return data.plans.slice(0, limit);
    }

    case 'readLog': {
      const indices = (args.indices || [])
        .filter(i => i >= 0 && i < data.history.length)
        .slice(0, settings.logContextLimit);
      return indices.map(i => {
        const arrayIdx = data.history.length - 1 - i;
        return { index: i, ...data.history[arrayIdx] };
      });
    }

    case 'readPlan': {
      const indices = (args.indices || [])
        .filter(i => i >= 0 && i < data.plans.length)
        .slice(0, settings.planContextLimit);
      return indices.map(i => {
        const arrayIdx = data.plans.length - 1 - i;
        return { index: i, ...data.plans[arrayIdx] };
      });
    }

    case 'readWeightLogs': {
      const { limit, indices, startDate, endDate } = args;
      let logs = [...data.weightLogs];

      if (indices && indices.length > 0) {
        const validIndices = indices
          .filter(i => i >= 0 && i < data.weightLogs.length)
          .slice(0, settings.weightLogLimit);
        return validIndices.map(i => {
          const arrayIdx = data.weightLogs.length - 1 - i;
          return { index: i, ...data.weightLogs[arrayIdx] };
        });
      }

      if (startDate || endDate) {
        logs = logs.filter(l => {
          const date = new Date(l.date);
          if (startDate && date < new Date(startDate)) return false;
          if (endDate && date > new Date(endDate)) return false;
          return true;
        });
      }

      const count = Math.min(limit || settings.weightLogLimit, settings.weightLogLimit);
      return logs.slice(-count).reverse();
    }

    default:
      console.warn(`Unknown tool called: ${name}`);
      return { error: 'Unknown tool' };
  }
}

// tool definitions sent to the model so it knows what it can call
const TOOL_DEFINITIONS = (settings: AiAssistantSettings) => [
  {
    name: 'readLogs',
    description: `Get training logs. Supports limits and date ranges.`,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: `Max logs to fetch (max ${settings.logContextLimit})` },
        startDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'readPlans',
    description: `Get workout plans.`,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: `Max plans to fetch (max ${settings.planContextLimit})` },
      },
    },
  },
  {
    name: 'readLog',
    description: 'Fetch specific logs by index (0 = oldest).',
    parameters: {
      type: 'object',
      properties: {
        indices: { type: 'array', items: { type: 'number' }, description: 'Array of log indices' },
      },
      required: ['indices'],
    },
  },
  {
    name: 'readPlan',
    description: 'Fetch specific plans by index (0 = oldest).',
    parameters: {
      type: 'object',
      properties: {
        indices: { type: 'array', items: { type: 'number' }, description: 'Array of plan indices' },
      },
      required: ['indices'],
    },
  },
  {
    name: 'readWeightLogs',
    description: `Get body weight logs. Supports date ranges and indices.`,
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        indices: { type: 'array', items: { type: 'number' } },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
  },
];

// gemini integration

async function callGemini(
  messages: ChatMessage[],
  settings: AiAssistantSettings & { apiKey: string },
  data: AiAssistantData
): Promise<ChatMessage> {
  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const model = genAI.getGenerativeModel({
    model: settings.primaryModel,
    systemInstruction: getSystemPrompt(data, settings),
  });

  const tools = [{ functionDeclarations: TOOL_DEFINITIONS(settings) }];

  const history = messages.slice(0, -1);
  const lastMsg = messages[messages.length - 1];

  const chat = model.startChat({
    history: history
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    tools: tools as any,
    generationConfig: { temperature: 0.7 },
  });

  const result = await chat.sendMessage(lastMsg.content);
  const response = result.response;
  
  const call = response.candidates?.[0].content.parts.find(p => p.functionCall);
  if (call) {
    const { name, args } = call.functionCall!;
    const toolResult = resolveToolCall(name, args as any, data, settings);

    const secondResult = await chat.sendMessage([
      {
        functionResponse: {
          name,
          response: { content: toolResult },
        },
      },
    ]);
    
    return {
      id: uuidv4(),
      role: 'assistant',
      content: secondResult.response.text(),
      timestamp: new Date().toISOString(),
      modelDisplayName: settings.primaryModel,
    };
  }

  return {
    id: uuidv4(),
    role: 'assistant',
    content: response.text(),
    timestamp: new Date().toISOString(),
    modelDisplayName: settings.primaryModel,
  };
}

// groq integration

async function callGroq(
  messages: ChatMessage[],
  settings: AiAssistantSettings & { apiKey: string },
  data: AiAssistantData
): Promise<ChatMessage> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const tools = TOOL_DEFINITIONS(settings).map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const payload = {
    model: settings.primaryModel,
    messages: [
      { role: 'system', content: getSystemPrompt(data, settings) },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    tools,
    tool_choice: 'auto',
    temperature: 0.7,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const result = await response.json();
  const message = result.choices[0].message;

  if (message.tool_calls) {
    const toolMessages = [...payload.messages, message];
    
    for (const toolCall of message.tool_calls) {
      const { name, arguments: argsJson } = toolCall.function;
      const args = JSON.parse(argsJson);
      const toolResult = resolveToolCall(name, args, data, settings);

      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name,
        content: JSON.stringify(toolResult),
      });
    }

    const secondResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.primaryModel,
        messages: toolMessages,
        temperature: 0.7,
      }),
    });

    if (!secondResponse.ok) {
      const error = await secondResponse.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const secondResult = await secondResponse.json();
    return {
      id: uuidv4(),
      role: 'assistant',
      content: secondResult.choices[0].message.content,
      timestamp: new Date().toISOString(),
      modelDisplayName: settings.primaryModel,
    };
  }

  return {
    id: uuidv4(),
    role: 'assistant',
    content: message.content,
    timestamp: new Date().toISOString(),
    modelDisplayName: settings.primaryModel,
  };
}

// helper functions

function getSystemPrompt(data: AiAssistantData, settings: AiAssistantSettings) {
  const now = new Date().toISOString().split('T')[0];
  let prompt = `You are CaliLog Assistant, an expert in calisthenics and gymnastics strength training.
Your goal is to help the user analyze their workout history, understand their progress, and optimize their training plans.

CURRENT DATE: ${now}

`;

  if (settings.personalContext) {
    prompt += `USER BACKGROUND & GOALS:
${settings.personalContext}

`;
  }

  prompt += `DATA OVERVIEW:
- Total Workout Logs: ${data.history.length} (Numbered #0 to #${data.history.length - 1})
- Total Workout Plans: ${data.plans.length} (Numbered #0 to #${data.plans.length - 1})
- Total Weight Logs: ${data.weightLogs.length} (Numbered #0 to #${data.weightLogs.length - 1})

*Note: Index 0 is always the oldest entry.*

CONSTRAINTS & RULES:
1. PROACTIVE FETCHING: If a user asks a question that requires data (e.g., "how are my plans?", "show my progress", "what did I do last week?"), immediately call the relevant tool. 
2. DATE RANGES: You can use startDate/endDate (strictly YYYY-MM-DD) to fetch logs for specific periods.
3. READ-ONLY: You cannot modify logs or plans.
4. TYPE SAFETY: Use proper JSON types for tool arguments.
`;
  return prompt;
}


