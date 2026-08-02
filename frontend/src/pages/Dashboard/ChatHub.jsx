import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Building2, 
  FileText, 
  Wrench, 
  Paperclip, 
  CheckCheck, 
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function ChatHub() {
  const { user, role } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      // Setup 4-second polling for live incoming chat messages
      const interval = setInterval(() => {
        fetchMessages(activeConversation.id, true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/conversations/');
      const data = res.data.results || res.data || [];
      setConversations(data);
      if (data.length > 0 && !activeConversation) {
        setActiveConversation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load chat conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId, isPolling = false) => {
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages/`);
      const data = res.data.results || res.data || [];
      setMessages(data);
      if (!isPolling) {
        fetchConversations();
      }
    } catch (err) {
      if (!isPolling) console.error('Failed to load chat messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    const contentToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await api.post(`/chat/conversations/${activeConversation.id}/messages/`, {
        content: contentToSend
      });
      setMessages((prev) => [...prev, res.data]);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send chat message:', err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conv) => {
    if (!conv || !user) return { full_name: 'Contact', role: '' };
    return conv.landlord_detail?.id === user.id ? conv.tenant_detail : conv.landlord_detail;
  };

  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherUser(conv);
    const nameMatch = other?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const propMatch = conv.property_title?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || propMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 140px)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare color="var(--primary-indigo)" size={28} /> Direct Landlord-Tenant Chat
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.875rem' }}>
            Timestamped & encrypted legal communication hub for tenancies under Nepal Rent Act 2075.
          </p>
        </div>
      </div>

      {/* Main Dual Panel Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Sidebar - Conversations List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem', overflow: 'hidden' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search tenant or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', height: '38px' }}
            />
          </div>

          {/* Conversations Items Stream */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                💬 No active chat threads. Start a conversation from the Agreements or Properties tab!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherUser(conv);
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                      background: isActive ? 'var(--pill-bg)' : 'var(--bg-input)',
                      border: isActive ? '1px solid var(--primary-indigo)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    {/* User Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--primary-indigo)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}>
                      {other?.full_name?.charAt(0) || 'U'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {other?.full_name || 'User'}
                        </strong>
                        {conv.last_message && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--primary-indigo)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem' }}>
                        <Building2 size={12} /> {conv.property_title}
                      </div>

                      {conv.last_message && (
                        <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>

                    {conv.unread_count > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '1rem'
                      }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Window */}
        {activeConversation ? (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Active Chat Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--primary-indigo)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem'
                }}>
                  {getOtherUser(activeConversation)?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {getOtherUser(activeConversation)?.full_name}
                    <span style={{ fontSize: '0.7rem', background: 'var(--pill-bg)', color: 'var(--primary-indigo)', padding: '0.15rem 0.5rem', borderRadius: '1rem', textTransform: 'capitalize', fontWeight: 700 }}>
                      {getOtherUser(activeConversation)?.role}
                    </span>
                  </h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <Building2 size={13} /> {activeConversation.property_title}
                  </span>
                </div>
              </div>

              {/* Quick Action Shortcuts */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href="/dashboard/agreements"
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--pill-bg)',
                    border: '1px solid var(--pill-border)',
                    color: 'var(--primary-indigo)',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <FileText size={14} /> Lease Agreement
                </a>
                <a
                  href="/dashboard/maintenance"
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Wrench size={14} /> Request Repair
                </a>
              </div>
            </div>

            {/* Message Stream */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              <div style={{ textAlign: 'center', margin: '0.5rem 0 1rem 0' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '0.3rem 0.75rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                  🔒 Official Tenancy Chat Thread &bull; Encrypted Audit History
                </span>
              </div>

              {messages.map((msg) => {
                const isMe = msg.sender === user?.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '65%',
                      padding: '0.75rem 1rem',
                      borderRadius: isMe ? '1rem 1rem 0.15rem 1rem' : '1rem 1rem 1rem 0.15rem',
                      background: isMe ? 'var(--primary-indigo)' : 'var(--bg-input)',
                      color: isMe ? '#ffffff' : 'var(--text-main)',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      fontSize: '0.9rem',
                      lineHeight: 1.45
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.725rem', marginBottom: '0.2rem', color: isMe ? 'rgba(255,255,255,0.85)' : 'var(--primary-indigo)' }}>
                        {isMe ? 'You' : msg.sender_name}
                      </div>
                      <div>{msg.content}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.25rem', marginTop: '0.3rem' }}>
                        <span style={{ fontSize: '0.675rem', color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck size={13} color={msg.is_read ? '#10b981' : 'rgba(255,255,255,0.75)'} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder={`Message ${getOtherUser(activeConversation)?.full_name}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={sending || !newMessage.trim()}
                style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Send size={16} /> Send
              </button>
            </form>

          </div>
        ) : (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} color="var(--primary-indigo)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>Select a conversation</h3>
            <p style={{ maxWidth: '360px', margin: 0, fontSize: '0.875rem' }}>
              Choose a tenant or landlord thread on the left to start real-time messaging.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
