import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader
} from '../../components/ui';
import { formatINR } from '../../lib/utils';
import { Bot, Send, Sparkles } from 'lucide-react';

export default function AiAssistant() {
  const [dashboardData, setDashboardData] = useState(null);
  const [reviewsData, setReviewsData] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your DentOS AI Assistant. Ask me about today\'s schedule, monthly summary, pending reviews, or stock alerts.',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [dash, revs] = await Promise.all([
          api.get('/dashboard').catch(() => null),
          api.get('/reviews').catch(() => [])
        ]);
        if (dash) setDashboardData(dash);
        if (revs) setReviewsData(revs);
      } catch (err) {
        console.error('Error loading AI assistant data:', err);
      }
    }
    loadData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);

  const generateReply = (userText) => {
    const text = userText.toLowerCase();
    const appts = dashboardData?.appointmentsToday || [];
    const revThisMonth = dashboardData?.revenueThisMonth || 0;
    const goals = dashboardData?.goals || [];
    const lowStock = dashboardData?.lowStock || [];
    const pendingReviews = reviewsData.filter((r) => r.status === 'pending').length;

    if (text.includes('schedule') || text.includes('today')) {
      if (appts.length === 0) {
        return 'You have no appointments scheduled for today.';
      }
      const list = appts
        .map((a) => `• ${a.time} — ${a.patientName} (${a.procedure || 'Checkup'})`)
        .join('\n');
      return `You have ${appts.length} appointment(s) today:\n${list}`;
    }

    if (text.includes('summary') || text.includes('monthly')) {
      const goalsList = goals
        .map((g) => `• ${g.label}: ${g.unit === '₹' ? formatINR(g.current) : g.current} / ${g.unit === '₹' ? formatINR(g.target) : g.target}`)
        .join('\n');
      return `Monthly Summary:\n• Revenue This Month: ${formatINR(revThisMonth)}\n\nGoals Progress:\n${goalsList || 'No active goals configured.'}`;
    }

    if (text.includes('review')) {
      return `${pendingReviews} pending review(s) awaiting moderation.`;
    }

    if (text.includes('stock') || text.includes('inventory')) {
      if (lowStock.length === 0) {
        return 'All inventory items are in stock and above minimum levels.';
      }
      const list = lowStock
        .map((i) => `• ${i.item}: ${i.quantity} ${i.unit || 'units'} left (Min: ${i.minStock})`)
        .join('\n');
      return `Low stock alerts:\n${list}`;
    }

    return "I can help with: today's schedule, monthly summary, pending reviews, or low stock alerts. Try one of the suggestions below!";
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || thinking) return;

    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setThinking(true);

    setTimeout(() => {
      const replyText = generateReply(query);
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: replyText,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setThinking(false);
    }, 1000);
  };

  const quickChips = [
    "Today's schedule",
    'Monthly summary',
    'Pending reviews',
    'Low stock alerts'
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="AI Assistant" subtitle="Ask anything about your practice" />

      <Card className="h-[550px] flex flex-col border shadow-sm">
        <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">DentOS Practice Assistant</CardTitle>
        </CardHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`rounded-lg p-3 text-sm whitespace-pre-wrap max-w-[80%] ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground self-end'
                    : 'bg-muted text-foreground self-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-primary">
                    <Bot className="h-3.5 w-3.5" />
                    <span>AI Assistant</span>
                  </div>
                )}
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
            </div>
          ))}

          {thinking && (
            <div className="flex flex-col items-start">
              <div className="rounded-lg p-3 text-sm bg-muted text-foreground max-w-[80%] flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs text-muted-foreground italic">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Chips Row */}
        <div className="px-4 py-2 bg-muted/20 border-t flex flex-wrap gap-2">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              disabled={thinking}
              className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {chip}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="p-3 border-t bg-card flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your question about schedule, reviews, revenue..."
            disabled={thinking}
            className="flex-1"
          />
          <Button onClick={() => handleSendMessage()} disabled={thinking || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
