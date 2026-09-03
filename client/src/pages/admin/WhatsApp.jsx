import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Avatar,
  EmptyState
} from '../../components/ui';
import { MessageCircle, Send } from 'lucide-react';

export default function WhatsApp() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const data = await api.get('/whatsappChats');
      const list = data || [];
      setChats(list);
      if (list.length > 0 && !selectedChatId) {
        setSelectedChatId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching whatsapp chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const selectedChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newMsg = {
      from: 'clinic',
      text: replyText.trim(),
      time: timeStr
    };

    const updatedMessages = [...(selectedChat.messages || []), newMsg];
    const updatedChat = { ...selectedChat, messages: updatedMessages, unread: 0 };

    try {
      setSending(true);
      await api.put(`/whatsappChats/${selectedChat.id}`, updatedChat);
      setReplyText('');
      setChats((prev) =>
        prev.map((c) => (c.id === selectedChat.id ? updatedChat : c))
      );
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <MessageCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Demo inbox — connect the WhatsApp Business API in Settings to go live.
          </p>
        </CardContent>
      </Card>

      {/* Two-Pane Card */}
      <Card className="h-[600px] flex overflow-hidden border shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground w-full flex items-center justify-center">
            Loading WhatsApp conversations...
          </div>
        ) : chats.length === 0 ? (
          <div className="w-full flex items-center justify-center">
            <EmptyState title="No WhatsApp conversations" subtitle="Patient chats will appear here." />
          </div>
        ) : (
          <div className="flex w-full h-full">
            {/* Left Pane - Chat list */}
            <div className="w-72 border-r flex flex-col bg-muted/10 shrink-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-sm">Patient Inbox</h3>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {chats.map((chat) => {
                  const lastMsg = chat.messages?.[chat.messages.length - 1];
                  const isSelected = chat.id === selectedChat?.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar name={chat.patientName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm truncate">{chat.patientName}</h4>
                          {chat.unread > 0 && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              {chat.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lastMsg ? lastMsg.text : 'No messages'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane - Chat Window */}
            {selectedChat ? (
              <div className="flex-1 flex flex-col h-full bg-card">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedChat.patientName} />
                    <div>
                      <h3 className="font-semibold text-sm">{selectedChat.patientName}</h3>
                      <p className="text-xs text-muted-foreground">{selectedChat.phone}</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(selectedChat.messages || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.from === 'clinic' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg p-3 text-sm max-w-[75%] ${
                          msg.from === 'clinic'
                            ? 'bg-primary text-primary-foreground self-end'
                            : 'bg-muted text-foreground self-start'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {msg.time}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t bg-card flex items-center gap-2"
                >
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selectedChat.patientName}...`}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a chat to view messages
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
