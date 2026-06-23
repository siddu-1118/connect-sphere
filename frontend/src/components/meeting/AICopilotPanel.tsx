'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Trash2, Plus, Users, Check, Zap, AlertTriangle, FileText,
  Sliders, X, Send, Calendar, ChevronDown, Settings, Lock, Unlock,
  BookOpen, Clock, ShieldAlert, ExternalLink, Brain, Volume2, Bot, Info,
  AlertOctagon, CheckSquare, RefreshCw, BarChart2, ShieldCheck, User
} from 'lucide-react';

interface AICopilotPanelProps {
  meetingId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  participantsList?: string[];
  socket?: any;
}

interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  synced: { jira?: boolean; github?: boolean; notion?: boolean };
}

interface MeetingNote {
  id: string;
  role: 'Manager' | 'Developer' | 'Intern';
  text: string;
  timestamp: string;
}

interface RiskItem {
  id: string;
  risk: string;
  severity: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export function AICopilotPanel({
  meetingId,
  userId,
  userName,
  onClose,
  participantsList = [],
  socket
}: AICopilotPanelProps) {
  // --- Provider & API Settings ---
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'ai'>('all');
  const [provider, setProvider] = useState<'gemini' | 'nvidia-hosted' | 'nvidia-local'>('nvidia-hosted');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('meta/llama-3.1-8b-instruct');
  
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState<string>('');

  // --- Common Simulation Input ---
  const [transcriptInput, setTranscriptInput] = useState<string>('');
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [processingFeature, setProcessingFeature] = useState<string | null>(null);

  // --- 1. Action Items state (Non-AI Manual / AI Extracted) ---
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: 'task-1',
      task: 'Prepare the ML report',
      owner: userName || 'Sai',
      deadline: 'Friday',
      synced: {}
    }
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState(userName || 'Sai');
  const [newTaskDeadline, setNewTaskDeadline] = useState('Friday');

  // --- 2. Fact Checker state ---
  const [factCheckClaims, setFactCheckClaims] = useState<{
    statement: string;
    verdict: string;
    explanation: string;
    timestamp: string;
  }[]>([
    {
      statement: 'Random Forest always performs better than Decision Trees.',
      verdict: 'Not Always True',
      explanation: 'Performance depends heavily on the dataset size, noise level, and hyperparameter tuning. Simple trees can sometimes perform better on extremely small datasets and are much more interpretable.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // --- 3. Live Knowledge Assistant state ---
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeResult, setKnowledgeResult] = useState<{
    topic: string;
    definition: string;
    diagram: string;
    examples: string[];
  } | null>({
    topic: 'Random Forest',
    definition: 'An ensemble learning method for classification, regression and other tasks that operates by constructing a multitude of decision trees at training time.',
    diagram: '       [Input Data]\n        /    |    \\\n    [Tree1] [Tree2] [Tree3]\n      |       |       |\n    [ClassA] [ClassB] [ClassA]\n        \\    |    /\n       [Majority Vote]\n              |\n          [Class A]',
    examples: ['Predicting customer churn', 'Credit card fraud detection', 'Image classification']
  });

  // --- 4. Meeting Risk Detector state ---
  const [riskLogs, setRiskLogs] = useState<RiskItem[]>([
    {
      id: 'risk-1',
      risk: 'Project delay due to database migration blockers.',
      severity: 'High',
      mitigation: 'Allocate two senior developers to resolve the schema mappings by tomorrow.'
    }
  ]);
  const [newRiskText, setNewRiskText] = useState('');
  const [newRiskSeverity, setNewRiskSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newRiskMitigation, setNewRiskMitigation] = useState('');

  // --- 5. Debate Moderator & Speaking Time state ---
  const [speakingTimes, setSpeakingTimes] = useState<Record<string, number>>({
    'Sai': 120,
    'John': 85,
    'Alice': 45,
    'Sarah': 0
  });
  const [activeSpeaker, setActiveSpeaker] = useState<string>('Sai');
  const [speakingLimitMinutes, setSpeakingLimitMinutes] = useState<number>(3);
  const [debateWarnings, setDebateWarnings] = useState<string[]>([
    'Sai has spoken for more than 2 minutes. Consider letting others contribute.',
    'Sarah remains silent. A contribution check is suggested.'
  ]);

  // --- 6. Personalized Summary state ---
  const [notes, setNotes] = useState<MeetingNote[]>([
    {
      id: 'n-1',
      role: 'Manager',
      text: 'Budget review scheduled for next Tuesday. Deadline for sprint deliverables is Friday.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'n-2',
      role: 'Developer',
      text: 'Refactor login validation schema. Fix memory leaks in LiveKit WebRTC hook.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'n-3',
      role: 'Intern',
      text: 'Explore Drizzle ORM relations. Complete SQL migrations task by Thursday.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteRole, setNewNoteRole] = useState<'Manager' | 'Developer' | 'Intern'>('Developer');
  const [activeSummaryRole, setActiveSummaryRole] = useState<'Manager' | 'Developer' | 'Intern'>('Developer');

  // --- 7. Whiteboard Assistant state ---
  const [whiteboardDiagramType, setWhiteboardDiagramType] = useState<'uml' | 'flowchart' | 'er'>('flowchart');
  const [whiteboardDiagramCode, setWhiteboardDiagramCode] = useState<string>(
    `graph TD\n  A[Start Call] --> B{AI Enabled?}\n  B -- Yes --> C[Run Gemini Copilot]\n  B -- No --> D[Use Manual Tools]`
  );
  const [isWhiteboardConverting, setIsWhiteboardConverting] = useState<boolean>(false);

  // --- 8. Attendance Intelligence state ---
  const [attendanceStats, setAttendanceStats] = useState<{
    name: string;
    joinTime: string;
    chatsSent: number;
    questionsAsked: number;
    speakingRatio?: number; // calculated in render
    score: number; // participation score
  }[]>([
    { name: 'Sai', joinTime: '10 mins ago', chatsSent: 8, questionsAsked: 3, score: 92 },
    { name: 'John', joinTime: '10 mins ago', chatsSent: 4, questionsAsked: 1, score: 78 },
    { name: 'Alice', joinTime: '8 mins ago', chatsSent: 3, questionsAsked: 2, score: 65 },
    { name: 'Sarah', joinTime: 'Absent (OOO)', chatsSent: 0, questionsAsked: 0, score: 0 }
  ]);

  // --- 9. Avatar Participation state ---
  const [avatarName, setAvatarName] = useState<string>('Sarah');
  const [avatarQueryText, setAvatarQueryText] = useState<string>('');
  const [avatarResponses, setAvatarResponses] = useState<{
    question: string;
    answer: string;
    timestamp: string;
  }[]>([
    {
      question: 'Is Sarah free on Tuesday for code reviews?',
      answer: 'Based on Sarah\'s Google Calendar and GitHub commit frequency: Sarah has an OOO block in the morning on Tuesday, but she is free from 2:00 PM to 4:30 PM. Her primary task is the login page code review.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // --- 10. Project Integration state ---
  const [integrationLogs, setIntegrationLogs] = useState<{
    platform: 'Jira' | 'GitHub' | 'Notion';
    action: string;
    status: 'success' | 'pending';
    timestamp: string;
  }[]>([
    { platform: 'Jira', action: 'Created Ticket [CS-402] - Prepare ML report', status: 'success', timestamp: '5 mins ago' }
  ]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // --- 11. Lie / Contradiction Detector state ---
  const [contradictionLogs, setContradictionLogs] = useState<{
    statement: string;
    context: string;
    explanation: string;
    timestamp: string;
  }[]>([
    {
      statement: 'Feature development hasn\'t started on Auth module.',
      context: 'Previous Meeting (yesterday): "Auth module completed and merged."',
      explanation: 'Possible discrepancy detected: The speaker claims work hasn\'t started, but yesterday\'s meeting notes audit shows the task was marked completed and merged.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // --- 12. Interview Mode state ---
  const [interviewCandidate, setInterviewCandidate] = useState<string>('Alex Johnson');
  const [interviewScores, setInterviewScores] = useState<Record<string, number>>({
    communication: 8,
    technical: 7,
    confidence: 9,
    sentiment: 8,
    skillMatch: 8
  });
  const [interviewNotesText, setInterviewNotesText] = useState<string>('Excellent presentation skills. Answered database replication questions clearly. Needs slightly more practical experience with LiveKit.');

  // --- Load Settings on Mount ---
  useEffect(() => {
    const storedProvider = localStorage.getItem('copilot_provider') as any;
    const storedKey = localStorage.getItem('copilot_api_key');
    const storedModel = localStorage.getItem('copilot_model');

    if (storedProvider) setProvider(storedProvider);
    if (storedKey) {
      setApiKey(storedKey);
    }
    if (storedModel) setModelName(storedModel);
  }, []);

  // --- Handle Provider Change ---
  const handleProviderChange = (newProvider: 'gemini' | 'nvidia-hosted' | 'nvidia-local') => {
    setProvider(newProvider);
    localStorage.setItem('copilot_provider', newProvider);

    // Update default models
    let defaultModel = '';
    if (newProvider === 'gemini') {
      defaultModel = 'gemini-1.5-flash';
      const geminiKey = localStorage.getItem('copilot_gemini_key') || '';
      setApiKey(geminiKey);
    } else if (newProvider === 'nvidia-hosted') {
      defaultModel = 'meta/llama-3.1-8b-instruct';
      const nvKey = localStorage.getItem('copilot_nvidia_key') || '';
      setApiKey(nvKey);
    } else if (newProvider === 'nvidia-local') {
      defaultModel = 'mistralai/mistral-medium-3.5-128b';
      setApiKey(''); // local NIM doesn't require keys
    }
    setModelName(defaultModel);
    localStorage.setItem('copilot_model', defaultModel);
  };

  // --- Save API Configuration ---
  const handleSaveApiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('copilot_provider', provider);
    localStorage.setItem('copilot_api_key', apiKey.trim());
    localStorage.setItem('copilot_model', modelName.trim());

    // Back up keys individually
    if (provider === 'gemini') {
      localStorage.setItem('copilot_gemini_key', apiKey.trim());
    } else if (provider === 'nvidia-hosted') {
      localStorage.setItem('copilot_nvidia_key', apiKey.trim());
    }

    setApiSuccessMsg('API settings saved!');
    setTimeout(() => setApiSuccessMsg(''), 3000);
    setShowApiKeyInput(false);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('copilot_api_key');
    if (provider === 'gemini') {
      localStorage.removeItem('copilot_gemini_key');
    } else if (provider === 'nvidia-hosted') {
      localStorage.removeItem('copilot_nvidia_key');
    }
    setApiSuccessMsg('API Key cleared.');
    setTimeout(() => setApiSuccessMsg(''), 3000);
  };

  const isApiConfigured = provider === 'nvidia-local' || apiKey.trim().length > 0;

  // --- Speaking timer simulation ---
  useEffect(() => {
    const names = Object.keys(speakingTimes);
    const interval = setInterval(() => {
      // Pick random active speaker 80% of the time
      if (Math.random() > 0.8) {
        const activeNames = names.filter(n => n !== 'Sarah');
        const randomName = activeNames[Math.floor(Math.random() * activeNames.length)];
        setActiveSpeaker(randomName);
        
        // Interrupt detection simulator
        if (randomName !== activeSpeaker && Math.random() > 0.7) {
          setDebateWarnings(prev => [
            `${randomName} entered discussion while ${activeSpeaker} was speaking.`,
            ...prev.slice(0, 4)
          ]);
        }
      }

      setSpeakingTimes(prev => ({
        ...prev,
        [activeSpeaker]: (prev[activeSpeaker] || 0) + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSpeaker, speakingTimes]);

  const totalSpeakingTime = Object.values(speakingTimes).reduce((a, b) => a + b, 0) || 1;

  // --- API Client Fetch Helper to Local Proxy ---
  const requestAI = async (prompt: string): Promise<string> => {
    setAiProcessing(true);
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          prompt,
          apiKey: apiKey.trim(),
          model: modelName.trim()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error calling model API proxy');
      }

      const data = await response.json();
      return data.text || '';
    } finally {
      setAiProcessing(false);
    }
  };

  // --- Handler for Manual Tools ---
  const handleAddActionItemManual = () => {
    if (!newTaskText.trim()) return;
    const newItem: ActionItem = {
      id: `task-${Date.now()}`,
      task: newTaskText.trim(),
      owner: newTaskOwner,
      deadline: newTaskDeadline,
      synced: {}
    };
    setActionItems(prev => [...prev, newItem]);
    setNewTaskText('');
  };

  const handleAddRiskManual = () => {
    if (!newRiskText.trim()) return;
    const newItem: RiskItem = {
      id: `risk-${Date.now()}`,
      risk: newRiskText.trim(),
      severity: newRiskSeverity,
      mitigation: newRiskMitigation.trim() || 'Monitor project status closely.'
    };
    setRiskLogs(prev => [...prev, newItem]);
    setNewRiskText('');
    setNewRiskMitigation('');
  };

  const handleAddNoteManual = () => {
    if (!newNoteText.trim()) return;
    const newItem: MeetingNote = {
      id: `note-${Date.now()}`,
      role: newNoteRole,
      text: newNoteText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotes(prev => [...prev, newItem]);
    setNewNoteText('');
  };

  const handleExportTask = async (id: string, platform: 'Jira' | 'GitHub' | 'Notion') => {
    setIsSyncing(true);
    await new Promise(r => setTimeout(r, 1200));
    setActionItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, synced: { ...item.synced, [platform]: true } };
      }
      return item;
    }));
    const taskObj = actionItems.find(t => t.id === id);
    setIntegrationLogs(prev => [
      {
        platform,
        action: `Synced task "${taskObj?.task}" to ${platform} (Assigned: ${taskObj?.owner})`,
        status: 'success',
        timestamp: 'Just now'
      },
      ...prev
    ]);
    setIsSyncing(false);
  };

  // --- Run AI Actions (Proxy-mediated) ---
  const runAIExtractor = async (text: string) => {
    if (!text.trim()) return;
    setProcessingFeature('action_extractor');
    try {
      const prompt = `Analyze this meeting transcript slice: "${text}".
Extract any actionable tasks mentioned. For each task, identify who should complete it (owner) and by when (deadline).
Format your response ONLY as a JSON array of objects, like this:
[{"task": "Prepare report", "owner": "Sai", "deadline": "Friday"}]
If no tasks are found, return empty array []. Output strictly valid JSON without markdown formatting.`;
      
      const res = await requestAI(prompt);
      const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        const mapped = parsed.map((item: any, idx: number) => ({
          id: `ai-task-${Date.now()}-${idx}`,
          task: item.task || 'Unnamed task',
          owner: item.owner || 'Unassigned',
          deadline: item.deadline || 'No deadline',
          synced: {}
        }));
        setActionItems(prev => [...prev, ...mapped]);
        setTranscriptInput('');
      }
    } catch (err: any) {
      console.error('AI Extractor error:', err);
      alert(`AI Extractor failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  const runAIFactChecker = async (text: string) => {
    if (!text.trim()) return;
    setProcessingFeature('fact_checker');
    try {
      const prompt = `Analyze this technical claim made during a meeting: "${text}".
Is it scientifically or technically accurate? Determine the verdict (e.g., "True", "False", "Not Always True", "Misleading").
Provide a concise, clear explanation (maximum 2-3 sentences) with correct facts.
Format your response as a simple JSON object:
{"verdict": "Verdict text", "explanation": "Brief explanation details"}
Output strictly valid JSON.`;

      const res = await requestAI(prompt);
      const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setFactCheckClaims(prev => [
        {
          statement: text,
          verdict: parsed.verdict || 'Unverified',
          explanation: parsed.explanation || 'No details provided.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);
      setTranscriptInput('');
    } catch (err: any) {
      console.error('Fact checker error:', err);
      alert(`Fact checker failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  const runAIKnowledgeAssistant = async (text: string) => {
    if (!text.trim()) return;
    setProcessingFeature('knowledge');
    try {
      const prompt = `The user is asking for knowledge about: "${text}".
Provide:
1. A 1-sentence definition of the topic.
2. A simple text-based ASCII diagram or schema flowchart illustrating the topic. Keep diagram lines compact.
3. List 3 practical examples or use cases.
Format the response ONLY as a JSON object:
{"topic": "${text}", "definition": "definition here", "diagram": "ASCII diagram", "examples": ["eg1", "eg2", "eg3"]}
Output strictly valid JSON.`;

      const res = await requestAI(prompt);
      const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setKnowledgeResult({
        topic: parsed.topic || text,
        definition: parsed.definition || '',
        diagram: parsed.diagram || '',
        examples: parsed.examples || []
      });
      setKnowledgeQuery('');
    } catch (err: any) {
      console.error('Knowledge assistant error:', err);
      alert(`Knowledge assistant failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  const runAIRiskDetector = async (text: string) => {
    if (!text.trim()) return;
    setProcessingFeature('risk');
    try {
      const prompt = `Analyze this text for any project, schedule, budget, technical, or resource risks: "${text}".
Format response strictly as a JSON object:
{"risk": "Description of the risk detected", "severity": "High" or "Medium" or "Low", "mitigation": "Recommended immediate action to mitigate the risk"}
Output strictly valid JSON.`;

      const res = await requestAI(prompt);
      const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setRiskLogs(prev => [
        {
          id: `risk-${Date.now()}`,
          risk: parsed.risk || 'General risk flagged.',
          severity: parsed.severity || 'Medium',
          mitigation: parsed.mitigation || 'Review details with team.'
        },
        ...prev
      ]);
      setTranscriptInput('');
    } catch (err: any) {
      console.error('Risk detector error:', err);
      alert(`Risk detector failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  const runAIWhiteboardAssistant = async () => {
    setIsWhiteboardConverting(true);
    try {
      const prompt = `Create a text-based ${whiteboardDiagramType.toUpperCase()} diagram for a typical Video Meeting Room software.
Provide the diagram using Mermaid.js syntax.
Do NOT include markdown block headers. Return ONLY the Mermaid code block starting with e.g. "graph TD" or "sequenceDiagram" or "erDiagram".`;

      const res = await requestAI(prompt);
      const cleanCode = res.replace(/```mermaid/g, '').replace(/```/g, '').trim();
      setWhiteboardDiagramCode(cleanCode);
    } catch (err: any) {
      console.error('Whiteboard assistant error:', err);
      alert(`Whiteboard assistant failed: ${err.message}`);
    } finally {
      setIsWhiteboardConverting(false);
    }
  };

  const runAIAvatarQuery = async () => {
    if (!avatarQueryText.trim()) return;
    setProcessingFeature('avatar');
    try {
      const calendar = `OOO block Tuesday 9 AM - 12 PM. Available Tuesday 2:00 PM - 5:00 PM. Standup 10 AM daily.`;
      const pastWork = `Merged user-auth schema branch. Fixed LiveKit room subscription leaks. Pending review on calendar component.`;
      const prompt = `You are the AI avatar agent representing ${avatarName} who is currently absent from this meeting.
You have access to her calendar details: "${calendar}" and her recent commit logs: "${pastWork}".
Answer the following question from the meeting participants on her behalf: "${avatarQueryText}".
Keep the answer professional, realistic, and brief (max 3 sentences).`;

      const answer = await requestAI(prompt);
      setAvatarResponses(prev => [
        {
          question: avatarQueryText,
          answer: answer.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);
      setAvatarQueryText('');
    } catch (err: any) {
      console.error('Avatar query error:', err);
      alert(`Avatar query failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  const runAIContradictionDetector = async (text: string) => {
    if (!text.trim()) return;
    setProcessingFeature('contradiction');
    try {
      const pastNotesContext = notes.map(n => n.text).join(' | ');
      const prompt = `Compare the current speaker statement: "${text}"
against the known facts or notes from previous discussions: "${pastNotesContext}".
Does the current statement contradict or conflict with the notes? If yes, identify the discrepancy.
Format your response strictly as a JSON object:
{"contradiction": true or false, "context": "Which previous note conflicts", "explanation": "Detailed explanation of the contradiction"}
Output strictly valid JSON.`;

      const res = await requestAI(prompt);
      const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.contradiction) {
        setContradictionLogs(prev => [
          {
            statement: text,
            context: parsed.context || 'Previous meeting records',
            explanation: parsed.explanation || 'Discrepancy detected in claims.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ]);
        setTranscriptInput('');
      } else {
        alert('No contradiction detected by the AI model for this statement.');
      }
    } catch (err: any) {
      console.error('Contradiction detector error:', err);
      alert(`Contradiction check failed: ${err.message}`);
    } finally {
      setProcessingFeature(null);
    }
  };

  // --- Trigger preset simulations ---
  const triggerPresetSim = (text: string, feature: string) => {
    setTranscriptInput(text);

    if (feature === 'action') runAIExtractor(text);
    else if (feature === 'fact') runAIFactChecker(text);
    else if (feature === 'risk') runAIRiskDetector(text);
    else if (feature === 'contradiction') runAIContradictionDetector(text);
  };

  return (
    <aside className="w-full sm:w-85 h-full bg-slate-955 border-l border-slate-900 flex flex-col justify-between shrink-0 shadow-2xl fixed sm:relative right-0 top-0 bottom-0 z-50 overflow-hidden font-outfit">
      
      {/* ── HEADER ── */}
      <div className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wider uppercase">
              AI Copilot Panel
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`p-1.5 rounded-lg transition-colors hover:bg-slate-900 ${isApiConfigured ? 'text-cyan-400' : 'text-slate-500'}`}
              title="API Integration Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
              aria-label="Close copilot panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Settings Section */}
        {showApiKeyInput && (
          <form onSubmit={handleSaveApiConfig} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mt-2 flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Settings className="w-2.5 h-2.5 text-cyan-400" />
                Copilot API Configuration
              </span>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="text-[9px] font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  Clear Key
                </button>
              )}
            </div>
            
            {/* Provider Select */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-505 uppercase">Model Provider</label>
              <select
                value={provider}
                onChange={e => handleProviderChange(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="nvidia-hosted">NVIDIA Hosted API Catalog</option>
                <option value="nvidia-local">NVIDIA Local NIM (Docker)</option>
                <option value="gemini">Google Gemini API</option>
              </select>
            </div>

            {/* API Key Input */}
            {provider !== 'nvidia-local' && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-505 uppercase">API Authentication Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={provider === 'gemini' ? 'Paste Gemini Key...' : 'Paste NVIDIA Key...'}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            )}

            {/* Model Name Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-505 uppercase">Model ID</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                placeholder="Model tag..."
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex gap-2 pt-1.5">
              <button
                type="submit"
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-black text-xs uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
            <p className="text-[8.5px] text-slate-500 leading-normal">
              Server proxies these settings. Custom keys are cached locally in your browser session.
            </p>
          </form>
        )}

        {apiSuccessMsg && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] py-1 px-3 rounded-lg flex items-center gap-1.5 shrink-0">
            <Info size={12} />
            <span>{apiSuccessMsg}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg mt-1 select-none">
          {(['all', 'active', 'ai'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterMode(tab)}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterMode === tab
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/50'
                  : 'text-slate-500 hover:text-slate-350 border border-transparent'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'active' ? 'Active (Manual)' : 'AI Tools'}
            </button>
          ))}
        </div>
      </div>

      {/* ── VIEWPORT ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 max-h-[calc(100vh-180px)] scrollbar-thin select-text">
        
        {/* SIMULATION CONSOLE */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <RefreshCw size={11} className={aiProcessing ? "animate-spin" : "animate-spin-slow"} />
              Live Transcript Simulation
            </span>
            <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full text-cyan-400 uppercase font-black">
              {provider.replace('-', ' ')}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={transcriptInput}
              onChange={e => setTranscriptInput(e.target.value)}
              placeholder="Type mock meeting speech..."
              className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-cyan-500 transition-colors font-outfit placeholder:text-slate-700"
            />
            <button
              onClick={() => runAIExtractor(transcriptInput)}
              disabled={!transcriptInput.trim() || aiProcessing || !isApiConfigured}
              className="px-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-40 text-cyan-400 hover:text-cyan-300 transition-all rounded-xl cursor-pointer"
              title="Trigger AI Extractor"
            >
              <Send size={12} />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => triggerPresetSim('Sai will prepare the ML report by Friday.', 'action')}
              className="text-[9px] bg-slate-950 border border-slate-850 hover:bg-slate-900 px-2 py-1 rounded-lg text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
            >
              "Sai prepare report Friday"
            </button>
            <button
              onClick={() => triggerPresetSim('Random Forest always performs better than Decision Trees.', 'fact')}
              className="text-[9px] bg-slate-950 border border-slate-850 hover:bg-slate-900 px-2 py-1 rounded-lg text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
            >
              "Random Forest always better"
            </button>
            <button
              onClick={() => triggerPresetSim('We are already 3 weeks behind schedule on production migration.', 'risk')}
              className="text-[9px] bg-slate-950 border border-slate-850 hover:bg-slate-900 px-2 py-1 rounded-lg text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
            >
              "3 weeks behind schedule"
            </button>
            <button
              onClick={() => triggerPresetSim('Feature development hasn\'t started on Auth module.', 'contradiction')}
              className="text-[9px] bg-slate-950 border border-slate-850 hover:bg-slate-900 px-2 py-1 rounded-lg text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
            >
              "Auth hasn't started"
            </button>
          </div>
        </div>

        {/* 1. ACTION ITEMS (Deterministic Manual + AI Extractor) */}
        {(filterMode === 'all' || filterMode === 'active' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckSquare size={13} className="text-cyan-400" />
                1. Action Items Generator
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active & AI Ready
              </span>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {actionItems.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-850 rounded-xl p-3 space-y-2 text-left relative overflow-hidden">
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button
                      onClick={() => handleExportTask(item.id, 'Jira')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                        item.synced.jira ? 'bg-blue-500 text-slate-950 font-black' : 'bg-slate-950 border border-slate-800 text-blue-400 hover:bg-slate-900'
                      }`}
                      disabled={isSyncing}
                    >
                      {item.synced.jira ? 'Jira ✔' : 'Jira'}
                    </button>
                    <button
                      onClick={() => handleExportTask(item.id, 'GitHub')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                        item.synced.github ? 'bg-purple-500 text-slate-950 font-black' : 'bg-slate-950 border border-slate-800 text-purple-400 hover:bg-slate-900'
                      }`}
                      disabled={isSyncing}
                    >
                      {item.synced.github ? 'GH ✔' : 'GH'}
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-202 pr-16">{item.task}</p>
                    <div className="flex gap-4 mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Owner: <strong className="text-slate-350">{item.owner}</strong></span>
                      <span>Deadline: <strong className="text-cyan-400">{item.deadline}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Manual Form (Deterministic Mode) */}
            {(filterMode === 'all' || filterMode === 'active') && (
              <div className="bg-slate-900/40 border border-slate-900/60 rounded-xl p-3 space-y-2 text-left">
                <p className="text-[9px] font-black uppercase text-slate-505 tracking-wider">Log Manual Action Item</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Task details..."
                    className="col-span-2 px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-555 font-outfit"
                  />
                  <input
                    type="text"
                    value={newTaskOwner}
                    onChange={e => setNewTaskOwner(e.target.value)}
                    placeholder="Owner..."
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-555 font-outfit"
                  />
                  <input
                    type="text"
                    value={newTaskDeadline}
                    onChange={e => setNewTaskDeadline(e.target.value)}
                    placeholder="Deadline..."
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-555 font-outfit"
                  />
                </div>
                <button
                  onClick={handleAddActionItemManual}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-cyan-400 rounded-lg transition-all cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            )}
          </section>
        )}

        {/* 2. FACT CHECKER (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Brain size={13} className="text-cyan-400" />
                2. AI Fact Checker
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {factCheckClaims.map((claim, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-850 rounded-xl p-3 text-left space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">Claim</span>
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">{claim.verdict}</span>
                      </div>
                      <p className="text-xs italic text-slate-400">"{claim.statement}"</p>
                      <p className="text-[11px] text-slate-205 bg-slate-950 p-2 border border-slate-850 rounded-lg leading-relaxed mt-1.5">{claim.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Fact Checker Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider and key in Settings (cog icon) to enable technical auditing.</p>
              </div>
            )}
          </section>
        )}

        {/* 3. LIVE KNOWLEDGE ASSISTANT (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen size={13} className="text-cyan-400" />
                3. Live Knowledge Assistant
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3 text-left">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={knowledgeQuery}
                    onChange={e => setKnowledgeQuery(e.target.value)}
                    placeholder="Ask, e.g. Explain Random Forest..."
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-500 font-outfit"
                  />
                  <button
                    onClick={() => runAIKnowledgeAssistant(knowledgeQuery)}
                    disabled={!knowledgeQuery.trim() || aiProcessing}
                    className="px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Ask
                  </button>
                </div>

                {knowledgeResult && (
                  <div className="bg-slate-905 border border-slate-850 rounded-xl p-3.5 space-y-2.5">
                    <div>
                      <span className="text-[8px] font-black uppercase text-cyan-405 tracking-widest">Topic Context</span>
                      <h5 className="text-xs font-bold text-slate-202 mt-0.5">{knowledgeResult.topic}</h5>
                    </div>
                    <p className="text-[11px] text-slate-350 leading-relaxed">{knowledgeResult.definition}</p>
                    {knowledgeResult.diagram && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Concept Sketch</span>
                        <pre className="text-[9.5px] font-mono text-cyan-400 bg-slate-950 border border-slate-900 rounded-lg p-2.5 mt-1 overflow-x-auto leading-normal">
                          {knowledgeResult.diagram}
                        </pre>
                      </div>
                    )}
                    {knowledgeResult.examples.length > 0 && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Examples</span>
                        <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5 mt-1">
                          {knowledgeResult.examples.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Knowledge Assistant Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider and key in Settings to draw text diagrams instantly.</p>
              </div>
            )}
          </section>
        )}

        {/* 4. RISK DETECTOR (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-cyan-400" />
                4. AI Risk Detector
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {riskLogs.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-slate-850 rounded-xl p-3 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <AlertTriangle size={9} /> Risk detected
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          item.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.severity} Severity
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-202">"{item.risk}"</p>
                      <div className="bg-slate-955 border border-slate-850 p-2.5 rounded-lg text-[10px] text-slate-350 leading-relaxed">
                        <strong className="text-cyan-405 block text-[8px] uppercase tracking-wider mb-0.5">Mitigation Plan</strong>
                        {item.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Risk Detector Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider and key to scan transcript for project delay alerts.</p>
              </div>
            )}
          </section>
        )}

        {/* 5. DEBATE MODERATOR & SPEAKING TIMER (Deterministic Active speaker tracking) */}
        {(filterMode === 'all' || filterMode === 'active') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 size={13} className="text-cyan-400" />
                5. Debate Moderator & Speaking Time
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            {/* Speaking Times Chart */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 text-left space-y-3 select-none">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-slate-505 uppercase tracking-widest">Live Speaking Ratio</span>
                <span className="text-[9px] font-bold text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Active: {activeSpeaker}
                </span>
              </div>
              <div className="space-y-2">
                {Object.entries(speakingTimes).map(([name, time]) => {
                  const ratio = (time / totalSpeakingTime) * 100;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-300">{name}</span>
                        <span className="text-slate-500">{Math.round(ratio)}% ({time}s)</span>
                      </div>
                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className={`h-full transition-all duration-500 ${activeSpeaker === name ? 'bg-cyan-500' : 'bg-slate-700'}`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Debate Warnings / Interruption notifications */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-left block">Moderator Auditor Log</span>
              <div className="bg-slate-905 border border-slate-900 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2 text-left">
                {debateWarnings.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic text-center py-2">No warnings flagged yet.</p>
                ) : (
                  debateWarnings.map((warn, i) => (
                    <div key={i} className="flex gap-2 text-[10px] text-slate-400 leading-normal border-b border-slate-900 pb-1.5 last:border-0 last:pb-0 gap-2">
                      <AlertOctagon size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* 6. PERSONALIZED MEETING SUMMARY (Deterministic Notes tag filter) */}
        {(filterMode === 'all' || filterMode === 'active') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={13} className="text-cyan-400" />
                6. Personalized Meeting Summary
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            {/* Role Tab Selector */}
            <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-lg select-none">
              {(['Manager', 'Developer', 'Intern'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setActiveSummaryRole(role)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeSummaryRole === role
                      ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/50'
                      : 'text-slate-500 hover:text-slate-355 border border-transparent'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Filtered Notes View */}
            <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 text-left space-y-2 min-h-[100px]">
              <div className="flex justify-between items-center mb-1 border-b border-slate-850 pb-1.5">
                <span className="text-[8px] font-black text-cyan-455 uppercase tracking-widest">{activeSummaryRole} Focus summary</span>
                <span className="text-[9px] text-slate-550 font-bold">Local Sync active</span>
              </div>
              
              {notes.filter(n => n.role === activeSummaryRole).length === 0 ? (
                <p className="text-xs text-slate-505 italic py-6 text-center">No notes found for this role focus.</p>
              ) : (
                notes.filter(n => n.role === activeSummaryRole).map(note => (
                  <div key={note.id} className="text-xs text-slate-205 leading-relaxed space-y-1">
                    <p className="font-outfit">{note.text}</p>
                    <span className="text-[8px] text-slate-600 block text-right font-semibold">{note.timestamp}</span>
                  </div>
                ))
              )}
            </div>

            {/* Add Note form */}
            <div className="bg-slate-900/40 border border-slate-900/60 rounded-xl p-3 space-y-2 text-left">
              <p className="text-[9px] font-black uppercase text-slate-505 tracking-wider">Append Categorized Note</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Type note details..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-555 font-outfit"
                />
                <select
                  value={newNoteRole}
                  onChange={e => setNewNoteRole(e.target.value as any)}
                  className="px-2 bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-350 rounded-lg outline-none cursor-pointer"
                >
                  <option value="Developer">Dev</option>
                  <option value="Manager">Mgr</option>
                  <option value="Intern">Int</option>
                </select>
              </div>
              <button
                onClick={handleAddNoteManual}
                className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-[10px] font-black uppercase tracking-widest text-cyan-400 rounded-lg transition-all cursor-pointer"
              >
                Save Categorized Note
              </button>
            </div>
          </section>
        )}

        {/* 7. WHITEBOARD ASSISTANT (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders size={13} className="text-cyan-400" />
                7. AI Whiteboard Assistant
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3 text-left">
                <div className="flex gap-2 select-none">
                  {(['flowchart', 'uml', 'er'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setWhiteboardDiagramType(type)}
                      className={`flex-1 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        whiteboardDiagramType === type
                          ? 'bg-slate-800 border-cyan-500/20 text-cyan-400'
                          : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button
                  onClick={runAIWhiteboardAssistant}
                  disabled={isWhiteboardConverting}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={11} className={isWhiteboardConverting ? 'animate-spin' : ''} />
                  {isWhiteboardConverting ? 'Converting sketch...' : 'Convert whiteboard to diagram'}
                </button>
                <div className="bg-slate-905 border border-slate-850 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Output code</span>
                    <button onClick={() => { navigator.clipboard.writeText(whiteboardDiagramCode); alert('Mermaid code copied!'); }} className="text-[8px] font-bold text-cyan-400 hover:underline cursor-pointer">Copy</button>
                  </div>
                  <pre className="text-[9.5px] font-mono text-cyan-400 bg-slate-950 border border-slate-900 rounded-lg p-2.5 overflow-x-auto leading-normal whitespace-pre-wrap break-all">
                    {whiteboardDiagramCode}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Whiteboard Assistant Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider to compile whiteboard drawings into Mermaid diagrams.</p>
              </div>
            )}
          </section>
        )}

        {/* 8. ATTENDANCE & ENGAGEMENT INTELLIGENCE (Deterministic logs) */}
        {(filterMode === 'all' || filterMode === 'active') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={13} className="text-cyan-400" />
                8. Attendance Intelligence
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            {/* Attendance List */}
            <div className="bg-slate-900 border border-slate-855 rounded-2xl p-4 text-left space-y-3">
              <div className="grid grid-cols-4 text-[9px] font-black text-slate-505 uppercase tracking-widest pb-1 border-b border-slate-850">
                <span className="col-span-2">Participant</span>
                <span className="text-center">Activity</span>
                <span className="text-right">Engagement</span>
              </div>
              <div className="space-y-2.5">
                {attendanceStats.map(stat => (
                  <div key={stat.name} className="grid grid-cols-4 items-center text-xs font-bold">
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-400 uppercase">
                        {stat.name[0]}
                      </div>
                      <div className="leading-tight">
                        <p className="text-slate-205">{stat.name}</p>
                        <p className="text-[8px] text-slate-500">{stat.joinTime}</p>
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-slate-400 uppercase leading-snug">
                      <p>{stat.chatsSent} Chats</p>
                      <p>{stat.questionsAsked} Qs</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        stat.score >= 80 ? 'bg-cyan-500/10 text-cyan-400' : stat.score >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-950 text-slate-600'
                      }`}>
                        {stat.score > 0 ? `${stat.score}%` : 'OOO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 9. AVATAR PARTICIPATION (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Bot size={13} className="text-cyan-400" />
                9. AI Avatar Participation
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-955 border border-slate-800 flex items-center justify-center text-[10px] text-cyan-405 uppercase font-black">SA</div>
                    <span className="text-xs font-bold text-slate-205">{avatarName}'s Avatar</span>
                  </div>
                  <span className="text-[8px] font-black uppercase text-amber-550 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Away (OOO)</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={avatarQueryText}
                    onChange={e => setAvatarQueryText(e.target.value)}
                    placeholder={`Query ${avatarName}'s Avatar...`}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-205 focus:outline-none focus:border-cyan-500 font-outfit"
                  />
                  <button
                    onClick={runAIAvatarQuery}
                    disabled={!avatarQueryText.trim() || aiProcessing}
                    className="px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Query
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {avatarResponses.map((res, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-855 rounded-xl p-3 text-left space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 italic">"Q: {res.question}"</p>
                      <p className="text-xs text-slate-205 bg-slate-950 p-2 border border-slate-850 rounded-lg leading-relaxed">{res.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Avatar Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider in settings to talk to absent teammates' calendars.</p>
              </div>
            )}
          </section>
        )}

        {/* 10. PROJECT INTEGRATION (Deterministic Export Log) */}
        {(filterMode === 'all' || filterMode === 'active') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ExternalLink size={13} className="text-cyan-400" />
                10. Project Integration Assistant
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            {/* Integration Status Log */}
            <div className="bg-slate-900 border border-slate-855 rounded-xl p-3 text-left space-y-2 max-h-48 overflow-y-auto">
              <span className="text-[8px] font-black text-slate-505 uppercase tracking-wider block">Recent Ticket Sync Log</span>
              {integrationLogs.length === 0 ? (
                <p className="text-[10px] text-slate-550 italic text-center py-4">No tasks synced yet.</p>
              ) : (
                integrationLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start justify-between text-[10.5px] border-b border-slate-950 pb-2 last:border-0 last:pb-0 gap-2">
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        log.platform === 'Jira' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : log.platform === 'GitHub' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>{log.platform}</span>
                      <span className="text-slate-350">{log.action}</span>
                    </div>
                    <span className="text-[8.5px] text-slate-500 font-bold shrink-0">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* 11. LIE / CONTRADICTION DETECTOR (AI-dependent) */}
        {(filterMode === 'all' || filterMode === 'ai') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-cyan-400" />
                11. AI Contradiction Detector
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${isApiConfigured ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {isApiConfigured ? `API: ${provider.split('-')[0]}` : 'API Key Required'}
              </span>
            </div>

            {isApiConfigured ? (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {contradictionLogs.map((log, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-850 rounded-xl p-3 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-rose-455 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <AlertTriangle size={9} /> Contradiction Detected
                        </span>
                        <span className="text-[9.5px] text-slate-500 font-bold">{log.timestamp}</span>
                      </div>
                      <p className="text-xs italic text-slate-400">"Statement: {log.statement}"</p>
                      <p className="text-[10px] text-slate-505 bg-slate-950 p-2 rounded-lg leading-normal"><strong>Context:</strong> {log.context}</p>
                      <p className="text-[11px] text-slate-205 leading-relaxed">{log.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl text-center select-none">
                <Lock size={16} className="text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Contradiction Detector Inactive</p>
                <p className="text-[9px] text-slate-600 mt-1">Configure an API provider in settings to track statements contradicting previous notes.</p>
              </div>
            )}
          </section>
        )}

        {/* 12. INTERVIEW MODE (Deterministic Rubric score evaluator) */}
        {(filterMode === 'all' || filterMode === 'active') && (
          <section className="space-y-3.5 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders size={13} className="text-cyan-400" />
                12. Recruiter Interview Scorecard
              </h4>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            {/* Rubrics Form */}
            <div className="bg-slate-900 border border-slate-855 rounded-2xl p-4 text-left space-y-3 select-none">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-1">
                <div className="leading-tight">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Recruitment Mode</span>
                  <input
                    type="text"
                    value={interviewCandidate}
                    onChange={e => setInterviewCandidate(e.target.value)}
                    placeholder="Candidate name..."
                    className="bg-transparent text-xs font-bold text-slate-202 outline-none w-36 border-b border-transparent focus:border-slate-800"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Average Grade</span>
                  <span className="text-xs font-black text-cyan-400">
                    {(Object.values(interviewScores).reduce((a, b) => a + b, 0) / 5).toFixed(1)} / 10
                  </span>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2">
                {Object.entries(interviewScores).map(([key, score]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-450 capitalize">{key.replace('SkillMatch', 'Skill Match')}</span>
                      <span className="text-cyan-400">{score} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={score}
                      onChange={e => setInterviewScores(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-full appearance-none cursor-pointer accent-cyan-400 border border-slate-850"
                    />
                  </div>
                ))}
              </div>

              {/* Recruiter Notes */}
              <div className="space-y-1 pt-1 text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recruiter Notes Summary</span>
                <textarea
                  value={interviewNotesText}
                  onChange={e => setInterviewNotesText(e.target.value)}
                  rows={2}
                  placeholder="Candidate performance comments..."
                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-[10.5px] text-slate-205 focus:outline-none focus:border-cyan-555 outline-none resize-none font-outfit"
                />
              </div>

              {/* Report Exporter */}
              <button
                onClick={() => {
                  const avg = (Object.values(interviewScores).reduce((a, b) => a + b, 0) / 5).toFixed(1);
                  const reportText = `RECRUITER REPORT\nCandidate: ${interviewCandidate}\nDate: ${new Date().toLocaleDateString()}\nAverage Score: ${avg}/10\n-----------------------\nScores:\n- Communication: ${interviewScores.communication}/10\n- Technical: ${interviewScores.technical}/10\n- Confidence: ${interviewScores.confidence}/10\n- Sentiment: ${interviewScores.sentiment}/10\n- Skill Match: ${interviewScores.skillMatch}/10\n-----------------------\nNotes: ${interviewNotesText}`;
                  const blob = new Blob([reportText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Recruiter_Report_${interviewCandidate.replace(/\s+/g, '_')}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-cyan-405 hover:text-cyan-300 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileText size={11} /> Export Recruiter Report
              </button>
            </div>
          </section>
        )}

      </div>
    </aside>
  );
}
