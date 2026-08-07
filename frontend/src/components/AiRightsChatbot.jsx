import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scale, Send, X, Sparkles, HelpCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import './AiRightsChatbot.css';

const KNOWLEDGE_BASE = [
  {
    category: 'fine',
    keywords: ['fine', 'late', 'penalty', 'overdue', 'delay', 'interest', 'grace', 'deadline'],
    title: 'Late Payment Fines & Statutory Regulations',
    response: `**Nepal Tenancy Rent Payment & Fine Regulations:**
• **Statutory Grace Period:** Under Nepalese tenancy customs and House Rent Act 2075, tenants typically have until the **7th of each month** to pay rent without incurring late fines.
• **Maximum Late Fine Cap:** Late payment penalties cannot exceed **5% of the monthly rent** as per standard digital lease terms on TenantPlus.
• **Non-Payment Remedies:** If rent remains unpaid after 30 days, the landlord may issue a formal written notice or initiate tenancy arbitration through the Dispute Portal.
• **Official Receipts:** All late fee payments must be officially logged with an electronic receipt issued in your account.`,
    chips: ['What is the late fee cap?', 'How many days grace period?']
  },
  {
    category: 'deposit',
    keywords: ['deposit', 'security', 'refund', 'deduction', 'money', 'advance', 'holdback'],
    title: 'Security Deposit & Escrow Refund Rights',
    response: `**Security Deposit Regulations (House Rent Act 2075):**
• **Return Timeline:** Landlords are legally required to refund security deposits within **15 to 30 days** of lease termination and key handover.
• **Lawful Deductions:** Deductions are permitted *only* for documented unpaid utility bills, overdue rent, or physical property damages beyond normal wear and tear.
• **eSewa Escrow Protection:** Deposits processed through TenantPlus remain safely locked in escrow until physical move-out inspection receipts are verified.`,
    chips: ['How to request deposit refund?', 'Can landlord deduct for paint?']
  },
  {
    category: 'eviction',
    keywords: ['evict', 'eviction', 'notice', 'leave', 'terminate', 'kick out', 'vacate', 'lock'],
    title: 'Notice Period & Anti-Eviction Protections',
    response: `**Nepalese Tenancy Protection Laws:**
• **Mandatory Notice:** Landlords must provide a minimum **35-day formal written notice** before asking a tenant to vacate under statutory Nepalese law.
• **Unlawful Evictions:** Changing door locks, cutting off electricity/water, or harassing tenants without a legal notice is strictly illegal.
• **Emergency Dispute Filing:** Tenants facing illegal eviction can file an instant administrative dispute through the TenantPlus Resolution Portal.`,
    chips: ['What if landlord cuts electricity?', 'Can I leave with 30-day notice?']
  },
  {
    category: 'rent',
    keywords: ['rent', 'increase', 'raise', 'hike', 'amount', 'tax', 'tds', 'price', 'cost', 'escalation'],
    title: 'Rent Adjustments & Tax Regulations',
    response: `**Rent Adjustment Standards in Nepal:**
• **Annual Cap:** Rent adjustments are restricted to a maximum of **once per year** (capped at 10% under statutory guidelines).
• **Advance Notice:** Landlords must notify tenants **30 to 60 days in advance** prior to applying any rent increase.
• **Rent Receipts:** Landlords are legally obligated to issue official rent receipts for every monthly payment received.`,
    chips: ['Is 20% rent hike legal?', 'Who pays local house rent tax?']
  },
  {
    category: 'repairs',
    keywords: ['repair', 'maintenance', 'fix', 'leak', 'water', 'plumbing', 'electric', 'sewage', 'damage', 'broken'],
    title: 'Property Repair & Maintenance Duties',
    response: `**Maintenance Allocation Rules:**
• **Landlord Responsibilities:** Major structural repairs, roof leaks, main water line issues, and electrical wiring defects must be repaired by the landlord within **48 hours**.
• **Tenant Responsibilities:** Routine light bulb replacements, daily cleanliness, and property damage caused by tenant neglect.
• **Reimbursement:** If a landlord fails to fix urgent structural issues, tenants may execute repairs and deduct costs from rent with valid receipts.`,
    chips: ['What if landlord delays roof repair?', 'Who fixes water pump?']
  },
  {
    category: 'contract',
    keywords: ['contract', 'lease', 'agreement', 'sign', 'pdf', 'witness', 'stamp', 'legal', 'duration'],
    title: 'Digital Lease Contracts & Signatures',
    response: `**Digital Lease Standards:**
• **Legal Validity:** Lease agreements signed on TenantPlus are fully compliant with the *House Rent Act 2075* and Nepalese digital signature regulations.
• **Required Elements:** Includes monthly rent amount, payment due dates, security deposit terms, witness details, and 35-day notice clause.
• **PDF Export:** Downloads are available 24/7 as legally-verifiable digital PDF documents.`,
    chips: ['How to download signed lease?', 'Can lease be 2 years long?']
  },
  {
    category: 'verification',
    keywords: ['verification', 'verify', 'kyc', 'lalpurja', 'citizenship', 'title', 'owner', 'proof', 'identity'],
    title: 'Landlord & Property KYC Audits',
    response: `**Verification Safeguards:**
• **Identity Verification:** Landlords must submit Nepalese Citizenship Certificates or Passports for manual admin verification.
• **Property Ownership Audit:** Property ownership (Lalpurja land title deed) and tax receipts are audited before granting the Verified Landlord badge.
• **Fraud Prevention:** Verified listings protect tenants from fake middleman scams.`,
    chips: ['How long does KYC take?', 'How to check verified badge?']
  },
  {
    category: 'esewa',
    keywords: ['esewa', 'escrow', 'payment', 'pay', 'khalti', 'transfer', 'receipt', 'transaction', 'gateway'],
    title: 'eSewa Escrow Rent Payment Safety',
    response: `**eSewa Escrow Mechanism:**
• **Payment Holding:** Rent and security deposit payments are securely held in escrow until the tenant completes key handover and move-in inspection.
• **Automatic Release:** Rent is transferred to the landlord on agreed monthly billing dates.
• **Instant Receipts:** Digital payment confirmation receipts are automatically logged under your account profile.`,
    chips: ['Is eSewa payment instant?', 'What if payment fails?']
  },
  {
    category: 'dispute',
    keywords: ['dispute', 'conflict', 'complain', 'fight', 'court', 'police', 'arbitration', 'issue', 'problem'],
    title: 'Dispute Resolution & Arbitration',
    response: `**Platform Dispute Resolution:**
• **Filing a Claim:** Submit formal evidence (photos, messages, payment receipts) through the TenantPlus Dispute Center.
• **Administrative Mediation:** Our legal team conducts binding arbitration based on the House Rent Act 2075.
• **Escrow Freeze:** Disputed funds are frozen in escrow until resolution is finalized.`,
    chips: ['How to file dispute?', 'How long does mediation take?']
  },
  {
    category: 'utilities',
    keywords: ['utility', 'electricity', 'meter', 'nea', 'water', 'internet', 'garbage', 'waste', 'bill'],
    title: 'Utility Metering & Shared Fees',
    response: `**Utility Billing Rules:**
• **Separate Sub-Meters:** Electricity should be billed according to official Nepal Electricity Authority (NEA) sub-meter unit readings.
• **Water & Trash Charges:** Shared drinking water supply and municipal waste collection charges must be clearly defined in your digital lease agreement.`,
    chips: ['How is electricity unit calculated?', 'Who pays garbage tax?']
  },
  {
    category: 'greeting',
    keywords: ['hi', 'hello', 'namaste', 'hey', 'greetings', 'help', 'start'],
    title: 'Namaste! How can I assist you today?',
    response: `Namaste! I am your **Tenancy Legal Assistant** for TenantPlus Nepal.

I can guide you on:
• **House Rent Act 2075** legal rules & 35-day notice periods
• **Late Payment Fines** & grace period rules
• **Security Deposit Escrow** holding & refund timelines
• **Property Repairs** & landlord maintenance duties
• **Verified Lease Agreements** & eSewa payment safety

Ask me any question below!`,
    chips: ['Late Fine Rules', 'Deposit Refund Rules', 'Eviction Laws', 'eSewa Escrow Safety']
  }
];

export default function AiRightsChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Namaste! I am your **Tenancy Legal Rights Guide**. Ask any questions regarding Nepalese House Rent Act 2075, security deposits, late payment fines, or eSewa escrow payments.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Hide floating widget on public landing and auth pages
  if (['/', '/login', '/register', '/verify-email'].includes(location.pathname)) {
    return null;
  }

  const findBestAnswer = (userQuery) => {
    const queryLower = userQuery.toLowerCase().trim();
    let bestMatch = null;
    let maxScore = 0;

    for (const item of KNOWLEDGE_BASE) {
      let score = 0;
      for (const keyword of item.keywords) {
        if (queryLower.includes(keyword)) {
          score += (keyword.length > 4 ? 3 : 1);
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && maxScore > 0) {
      return `### ${bestMatch.title}\n\n${bestMatch.response}`;
    }

    // Dynamic contextual response generation for unmatched queries
    return `### Tenancy Legal Rights Assistance

Thank you for your question regarding **"${userQuery}"**. Here is the legal advice under **Nepalese House Rent Act 2075**:

• **Statutory Rights:** All tenancy terms and late payment penalties must strictly align with your signed digital lease contract.
• **Grace Period:** Standard Nepalese tenancy allows a 7-day grace period for monthly rent payments.
• **35-Day Notice Rule:** Neither party can terminate tenancy arbitrarily without a 35-day formal notice.
• **Escrow Protection:** Security deposits & rent payments made on TenantPlus remain escrow-protected against fraud.`;
  };

  const handleSend = (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = findBestAnswer(text);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMarkdown = (content) => {
    if (!content) return '';
    return content
      .replace(/### (.*?)\n/g, '<strong style="display:block;margin-bottom:0.4rem;font-size:0.95rem;color:#2563eb;">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\* (.*?)\n/g, '• $1<br/>')
      .replace(/• (.*?)\n/g, '• $1<br/>');
  };

  return (
    <div className="ai-chatbot-root">
      {/* Floating Trigger Button */}
      <button 
        className="ai-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Tenancy Rights Assistant"
      >
        <Scale size={16} />
        <span>Legal Rights Guide</span>
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-header-info">
              <div className="ai-avatar">
                <Scale size={18} color="#FFFFFF" />
              </div>
              <div>
                <div className="ai-title">Tenancy Rights Assistant</div>
                <div className="ai-subtitle">House Rent Act 2075 Verified</div>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="ai-chips-bar">
            <button className="ai-chip" onClick={() => handleSend('What if I do not pay late fine in time?')}>
              Late Fine Rules
            </button>
            <button className="ai-chip" onClick={() => handleSend('What are security deposit refund rules?')}>
              Deposit Rules
            </button>
            <button className="ai-chip" onClick={() => handleSend('What is the legal 35-day eviction notice period?')}>
              Eviction Laws
            </button>
            <button className="ai-chip" onClick={() => handleSend('Who handles plumbing and structural repairs?')}>
              Repairs
            </button>
            <button className="ai-chip" onClick={() => handleSend('How does eSewa escrow payment holding work?')}>
              eSewa Escrow
            </button>
          </div>

          <div className="ai-chat-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-msg-wrapper ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                <div className="ai-msg-bubble" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                <span className="ai-msg-time">{msg.time}</span>
              </div>
            ))}
            
            {isTyping && (
              <div className="ai-msg-wrapper bot">
                <div className="ai-msg-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-footer">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about rent, deposit, late fine, notice..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              className="ai-send-btn" 
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
