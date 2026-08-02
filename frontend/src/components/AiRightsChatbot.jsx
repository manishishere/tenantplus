import React, { useState, useRef, useEffect } from 'react';
import './AiRightsChatbot.css';

const PREBUILT_KNOWLEDGE = [
  {
    keywords: ['deposit', 'security', 'refund', 'deduction', 'money'],
    title: '🛡️ Security Deposit & Refund Rights',
    response: `**Security Deposit Regulations & Guidelines:**
- **Return Timeline:** Landlords are legally required to refund the security deposit within **15 to 30 days** of lease termination and keys handover.
- **Lawful Deductions:** Deductions are permitted *only* for unpaid utility bills, overdue rent, or documented property damages beyond normal wear and tear.
- **Proof Required:** Landlords must provide itemized receipts/invoices for any repair cost deducted. Normal wall paint scuffs or age degradation cannot be deducted.`,
    tags: ['Deposit Return', 'Wear & Tear', 'Receipts']
  },
  {
    keywords: ['evict', 'eviction', 'notice', 'leave', 'kick out', 'terminate'],
    title: '📜 Notice Period & Eviction Rights',
    response: `**Eviction & Termination Protections:**
- **Mandatory Notice:** Landlords must provide a minimum **35-day written notice** before requesting a tenant to vacate.
- **Unlawful Eviction:** Instant locks changing, turning off water/electricity, or verbal force without official notice is strictly illegal.
- **Tenant Termination:** Tenants must give a **30-day written notice** prior to moving out as standard practice under typical lease agreements.`,
    tags: ['35-Day Notice', 'Tenant Protection', 'Unlawful Lockout']
  },
  {
    keywords: ['rent', 'increase', 'raise', 'hike', 'amount', 'ceiling'],
    title: '📈 Rent Increase & Payment Rules',
    response: `**Rent Adjustment Standards:**
- **Frequency Limit:** Rent increases can only occur **once per year** (or at lease renewal), not arbitrarily mid-contract.
- **Advance Notice:** Landlords must notify tenants at least **30 to 60 days in advance** of any proposed rent adjustment.
- **Rent Receipts:** Landlords must issue a written or digital receipt (like TenantPlus e-receipts) immediately upon rent collection.`,
    tags: ['Annual Increase', '60-Day Notice', 'Digital Receipts']
  },
  {
    keywords: ['repair', 'maintenance', 'fix', 'water', 'leak', 'plumbing', 'broken', 'electricity'],
    title: '🔧 Maintenance & Repair Responsibilities',
    response: `**Property Upkeep & Maintenance Duties:**
- **Landlord Duties:** Major structural repairs, roofing, main plumbing leaks, electrical wiring, and permanent fixture defects must be repaired by the landlord within 48-72 hours.
- **Tenant Duties:** Daily maintenance, keeping the premises clean, replacing light bulbs, and repairing damage caused by neglect or misuse.
- **Emergency Repairs:** If an urgent hazard (pipe burst, gas line) is ignored by landlord, tenant may repair and deduct certified costs from next rent payment with receipts.`,
    tags: ['48h Emergency Repair', 'Structural Upkeep', 'Certified Deductions']
  },
  {
    keywords: ['privacy', 'entry', 'visit', 'inspection', 'enter', 'landlord come'],
    title: '🔑 Right to Quiet Enjoyment & Privacy',
    response: `**Privacy & Property Access Rights:**
- **Prior Notice:** Landlords **cannot enter** the rented room/flat unannounced. They must provide at least **24 to 48 hours advance notice**.
- **Reasonable Timing:** Inspections or visits must occur during reasonable daytime hours agreed upon in advance.
- **Quiet Enjoyment:** Tenants have the right to peaceful, undisturbed use of the leased space throughout their tenancy term.`,
    tags: ['24h Prior Notice', 'Daytime Visits', 'Quiet Enjoyment']
  },
  {
    keywords: ['real', 'fake', 'verify', 'landlord', 'trust', 'scam', 'proof'],
    title: '✅ Verifying Real vs. Fake Landlords & Listings',
    response: `**How TenantPlus Verifies Landlords & Prevents Scams:**
- **Verified Landlord Badge (🛡️ Checkmark):** Displays when the landlord has uploaded verified Government Citizenship / Passport and official Property Ownership Documents.
- **Direct Platform Escrow:** Never transfer money directly via unverified offline methods before signing. Payments on TenantPlus are safely held in **Escrow** until move-in terms are verified.
- **Red Flags:** Beware of landlords refusing physical/video property tours, demanding upfront cash transfers without verified profile badges, or listing prices drastically below market average.`,
    tags: ['Verified Badge', 'Escrow Guard', 'Anti-Scam']
  }
];

export default function AiRightsChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '👋 Hello! I am **TenantPlus Rights Guardian**, your AI Assistant on rental laws, landlord/tenant legal rights, deposit policies, and scam prevention.\n\nHow can I help educate you today?',
      tags: ['Verified Landlords', 'Deposit Rules', 'Eviction Rights', 'Escrow Safety'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let matchedTopic = PREBUILT_KNOWLEDGE.find((item) =>
        item.keywords.some((kw) => lowerQuery.includes(kw))
      );

      let botResponseText = '';
      let botTags = [];

      if (matchedTopic) {
        botResponseText = `### ${matchedTopic.title}\n\n${matchedTopic.response}`;
        botTags = matchedTopic.tags;
      } else {
        botResponseText = `### ℹ️ Legal Rights Overview for "${query}"\n\nUnder standard housing laws & TenantPlus fair tenancy practices:\n- **Transparency:** Both parties must adhere to agreed written lease agreements.\n- **Dispute Resolution:** In case of disagreement, file a formal claim under the TenantPlus **Disputes Portal** for audited arbitration.\n- **Legal Protection:** You have rights regarding habitability, proper notice, and escrow-secured financial transactions.`;
        botTags = ['Tenancy Rights', 'Dispute Resolution', 'Escrow Secured'];
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        tags: botTags,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleChipClick = (chipText) => {
    handleSend(chipText);
  };

  return (
    <div className="ai-chatbot-wrapper">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          className="ai-chatbot-trigger-btn"
          onClick={() => setIsOpen(true)}
          title="Open AI Rights Guardian"
        >
          <div className="ai-bot-icon-pulse">
            <span>🤖</span>
          </div>
          <div className="ai-trigger-text">
            <span className="ai-title-bold">AI Rights Guardian</span>
            <span className="ai-sub-text">Legal & Tenancy Help</span>
          </div>
        </button>
      )}

      {/* Chat Drawer Widget */}
      {isOpen && (
        <div className="ai-chatbot-container glass-card">
          {/* Header */}
          <div className="ai-chatbot-header">
            <div className="ai-header-info">
              <div className="ai-avatar-badge">🤖</div>
              <div>
                <h3 className="ai-header-title">AI Rights Guardian</h3>
                <span className="ai-header-status">
                  <span className="online-dot"></span> Educating Landlords & Tenants
                </span>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setIsOpen(false)} aria-label="Close Chat">
              ✕
            </button>
          </div>

          {/* Prompt Chips Bar */}
          <div className="ai-quick-chips">
            <button
              className="ai-chip"
              onClick={() => handleChipClick('How to differentiate real landlord vs fake landlord?')}
            >
              🔍 Real vs Fake Landlords
            </button>
            <button
              className="ai-chip"
              onClick={() => handleChipClick('What are deposit refund rules and timelines?')}
            >
              🛡️ Deposit Refund Rules
            </button>
            <button
              className="ai-chip"
              onClick={() => handleChipClick('What is the legal eviction notice period?')}
            >
              📜 Eviction Notice Laws
            </button>
            <button
              className="ai-chip"
              onClick={() => handleChipClick('Who handles major plumbing and water leaks?')}
            >
              🔧 Maintenance & Repairs
            </button>
            <button
              className="ai-chip"
              onClick={() => handleChipClick('Is payment kept in escrow or direct to landlord?')}
            >
              💳 Payment & Escrow Flow
            </button>
          </div>

          {/* Messages Feed */}
          <div className="ai-messages-feed">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
                {msg.sender === 'bot' && <div className="ai-msg-avatar">🤖</div>}
                <div className="ai-msg-bubble">
                  <div className="ai-msg-content">
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} className="ai-bubble-heading">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={idx} className="ai-bubble-strong">{line.replace(/\*\*/g, '')}</strong>;
                      }
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="ai-msg-tags">
                      {msg.tags.map((t, idx) => (
                        <span key={idx} className="ai-tag-pill">{t}</span>
                      ))}
                    </div>
                  )}
                  <span className="ai-msg-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-message-row bot">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-msg-bubble typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Form */}
          <form
            className="ai-chatbot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about lease laws, deposit rights, or landlord verification..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
            />
            <button type="submit" className="ai-send-btn" disabled={!inputQuery.trim()}>
              <span>Send</span> ➔
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
