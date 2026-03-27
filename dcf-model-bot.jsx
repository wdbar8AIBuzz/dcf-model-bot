import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `You are an AI-powered DCF (Discounted Cash Flow) modeling assistant. Your job is to help users build, understand, and analyze discounted cash flow valuations through a structured, guided workflow. You combine real financial modeling logic with clear explanations so users can both generate a working valuation model and understand the assumptions behind it.

You serve finance students, internship and job candidates, self-learners, beginner investors, and early-career professionals.

## Core Capabilities
You help users:
- Input historical financial data (income statement, balance sheet, cash flow)
- Set and adjust forecast assumptions (revenue growth, margins, capex, working capital, taxes)
- Calculate unlevered free cash flow (UFCF)
- Estimate WACC using CAPM
- Calculate terminal value (perpetuity growth and/or exit multiple method)
- Output enterprise value, equity value, and implied share price
- Run sensitivity cases and explain what is driving valuation

## Workbook Architecture (always reference these tabs in order)
1. Dashboard / Summary
2. Historical Inputs
3. Assumptions / Control Panel
4. Revenue Build
5. Operating Forecast
6. Supporting Schedules
7. Operating Model
8. WACC
9. Comps / Market Data
10. DCF
11. Sensitivity / Scenarios
12. Checks / Validation

## Data Flow: Historical Inputs → Assumptions → Revenue Build → Operating Forecast → Supporting Schedules → Operating Model → WACC + Comps → DCF → Sensitivity/Dashboard → Checks

## Key Formulas
- Cost of Equity = Rf + β × ERP
- After-Tax Cost of Debt = Kd × (1 − Tax Rate)
- WACC = (E/V × Ke) + (D/V × Kd_after_tax)
- UFCF = NOPAT + D&A − Capex − ΔNWC
- NOPAT = EBIT × (1 − Tax Rate)
- Terminal Value (Gordon Growth) = UFCF_terminal × (1+g) / (WACC − g)  [requires WACC > g]
- Terminal Value (Exit Multiple) = EBITDA × Multiple
- Enterprise Value = PV(UFCFs) + PV(Terminal Value)
- Equity Value = EV + Cash − Debt − Preferred − Minority Interest
- Implied Share Price = Equity Value / Diluted Shares

## Modeling Workflow
Step 1: Company Setup (name, ticker, industry, currency, units, fiscal year end)
Step 2: Historical Financial Data (3-5 years of income statement, balance sheet, cash flow)
Step 3: Forecast Assumptions (revenue growth, margins, tax rate, capex%, D&A%, NWC%)
Step 4: WACC Inputs (risk-free rate, ERP, beta, pre-tax cost of debt, capital structure)
Step 5: Build projections
Step 6: Calculate UFCF
Step 7: Terminal Value
Step 8: Discount to present value → Enterprise Value
Step 9: Equity Value and Implied Share Price
Step 10: Sensitivity and Scenarios

## Scenario Defaults
- Bear: Revenue growth = historical avg − 2-3pp, EBITDA margin conservative, terminal growth 1.5-2%, WACC +50-100bps
- Base: Revenue growth = historical avg, margins normalized, terminal growth 2-2.5%, WACC middle estimate
- Bull: Revenue growth = historical avg + 2-3pp, margins improving, terminal growth 2.5-3%, WACC −50-100bps

## Validation Rules
FAIL (block output): WACC missing, no terminal value method specified, revenue forecast missing, WACC ≤ terminal growth rate
WARNING (flag but proceed): terminal growth > 3.5%, WACC < 5% or > 20%, EBITDA margin 5pp+ above historical peak

## Output Format
When presenting model outputs, structure them clearly with:
1. Headline Summary table (EV, Equity Value, Implied Share Price, current price comparison, upside/downside)
2. Key Assumptions table (WACC, terminal growth, exit multiple if used, forecast period, active scenario)
3. Sensitivity table (WACC vs terminal growth showing implied share price at different combinations)
4. Brief explanation of what's driving the valuation

## Explanation Standards
For every major output, explain: what it is, how it was calculated, why it matters, what drives it, whether it looks reasonable vs. historical norms.

## Tone
- Structured and step-by-step
- Professional finance language with plain-English explanations
- Adapt to user level (more guidance for beginners, efficient for advanced)
- Never present a valuation without explaining what is driving it
- Flag aggressive assumptions but explain why rather than just rejecting them

## Boundaries
- DCF modeling assistant only — not an investment platform or stock recommendation engine
- No buy/sell recommendations or personalized investment advice
- Never fabricate historical financial data — ask for it or flag clearly if missing
- Always note that outputs depend entirely on assumptions entered

When the user provides financial data, perform actual calculations using the formulas above and present real computed results. Show your work clearly. Be the most helpful, knowledgeable DCF modeling tutor possible.`;

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="15" strokeWidth="3"/><line x1="16" y1="15" x2="16" y2="15" strokeWidth="3"/>
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const SparkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91L12 2z"/>
  </svg>
);

// ─────────────────────────────────────────────
// QUICK PROMPTS
// ─────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "Start a new DCF", text: "I want to build a DCF model from scratch. Help me get started." },
  { label: "Run Apple DCF", text: "Let's build a DCF for Apple (AAPL). I'll use FY2023 data: Revenue $383B, EBITDA $125B, EBIT $114B, D&A $11B, Capex $11B, Net Income $97B. Cash $60B, Debt $111B, ~15.4B diluted shares, stock price ~$193. Use 5% risk-free rate, 5% ERP, beta 1.2, 4% pre-tax cost of debt, 80% equity / 20% debt. 3% terminal growth, 5-year forecast. Walk me through the full model." },
  { label: "Explain WACC", text: "Explain WACC to me in plain English. Why does it matter in a DCF? What makes it go up or down?" },
  { label: "Bull/bear scenarios", text: "What's the difference between a bull, base, and bear case in a DCF model? How do I decide what assumptions to use in each?" },
  { label: "Terminal value explained", text: "Explain terminal value — what it is, how both methods work, and which one I should use." },
  { label: "Sensitivity analysis", text: "Walk me through how to build a WACC vs terminal growth sensitivity table and what it tells me about my valuation." },
];

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// ─────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tables
    if (line.trim().startsWith("|") && lines[i + 1] && lines[i + 1].trim().startsWith("|---")) {
      const headers = line.trim().split("|").filter(Boolean).map(h => h.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().split("|").filter(Boolean).map(c => c.trim()));
        i++;
      }
      elements.push(
        <div key={key++} className="table-wrap">
          <table>
            <thead><tr>{headers.map((h, j) => <th key={j}>{inlineFormat(h)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{inlineFormat(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    // Code blocks
    if (line.trim().startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(<pre key={key++}><code>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    // H1/H2/H3
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++}>{inlineFormat(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++}>{inlineFormat(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={key++}>{inlineFormat(line.slice(2))}</h2>);
    }
    // HR
    else if (line.trim() === "---") {
      elements.push(<hr key={key++} />);
    }
    // Bullet lists
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        listItems.push(<li key={i}>{inlineFormat(lines[i].trim().slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={key++}>{listItems}</ul>);
      continue;
    }
    // Numbered lists
    else if (/^\d+\. /.test(line.trim())) {
      const listItems = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        listItems.push(<li key={i}>{inlineFormat(lines[i].trim().replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={key++}>{listItems}</ol>);
      continue;
    }
    // Blockquote
    else if (line.startsWith("> ")) {
      elements.push(<blockquote key={key++}>{inlineFormat(line.slice(2))}</blockquote>);
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<br key={key++} />);
    }
    // Paragraph
    else {
      elements.push(<p key={key++}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return elements;
}

function inlineFormat(text) {
  // Bold+italic ***text***
  // Bold **text**
  // Italic *text*
  // Code `text`
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1].startsWith("***")) parts.push(<strong key={k++}><em>{match[2]}</em></strong>);
    else if (match[1].startsWith("**")) parts.push(<strong key={k++}>{match[3]}</strong>);
    else if (match[1].startsWith("*")) parts.push(<em key={k++}>{match[4]}</em>);
    else if (match[1].startsWith("`")) parts.push(<code key={k++}>{match[5]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR NAV
// ─────────────────────────────────────────────
const TABS = [
  { id: "chat", label: "AI Assistant", icon: "✦" },
  { id: "divider" },
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "historical", label: "Historical Inputs", icon: "▣" },
  { id: "assumptions", label: "Assumptions", icon: "◉" },
  { id: "revenue", label: "Revenue Build", icon: "△" },
  { id: "opforecast", label: "Operating Forecast", icon: "◇" },
  { id: "schedules", label: "Supporting Schedules", icon: "▤" },
  { id: "opmodel", label: "Operating Model", icon: "▦" },
  { id: "wacc", label: "WACC", icon: "⊕" },
  { id: "comps", label: "Comps / Market Data", icon: "◎" },
  { id: "dcf", label: "DCF Valuation", icon: "◆" },
  { id: "sensitivity", label: "Sensitivity / Scenarios", icon: "⊞" },
  { id: "checks", label: "Checks / Validation", icon: "✓" },
];

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">DCF</div>
        <div className="logo-text">
          <span className="logo-title">Model Bot</span>
          <span className="logo-sub">Powered by Claude</span>
        </div>
      </div>
      <div className="sidebar-nav">
        {TABS.map((tab, i) => {
          if (tab.id === "divider") return <div key={i} className="nav-divider"><span>WORKBOOK TABS</span></div>;
          return (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? "active" : ""} ${tab.id === "chat" ? "nav-ai" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
              {tab.id === "chat" && <span className="nav-badge">AI</span>}
            </button>
          );
        })}
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-footer-text">Built on Claude Sonnet</div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// PLACEHOLDER WORKBOOK TABS
// ─────────────────────────────────────────────
function WorkbookTab({ tabId }) {
  const info = {
    dashboard: { title: "Dashboard / Summary", desc: "Headline valuation outputs, key assumptions, and scenario summary. Use the AI Assistant to build and populate this view by walking through your full DCF.", icon: "◈", color: "#E8B86D" },
    historical: { title: "Historical Inputs", desc: "Enter 3–5 years of historical income statement, balance sheet, and cash flow data. Tell the AI: 'Let's input historical data for [company]' to get started.", icon: "▣", color: "#7EC8A4" },
    assumptions: { title: "Assumptions / Control Panel", desc: "Central hub for all forecast assumptions, scenario selector (Base / Bull / Bear), and model switches. Tell the AI your assumptions and it will validate and apply them.", icon: "◉", color: "#9BB8E8" },
    revenue: { title: "Revenue Build", desc: "Dedicated top-line forecast engine. Supports total revenue growth method or segment-based builds. Ask the AI to project revenue based on your historical data.", icon: "△", color: "#E8A09B" },
    opforecast: { title: "Operating Forecast", desc: "Main forecast for COGS, gross profit, SG&A, EBITDA, EBIT, taxes, and NOPAT. Driven by revenue build and your margin assumptions.", icon: "◇", color: "#B89BE8" },
    schedules: { title: "Supporting Schedules", desc: "Capex, D&A, working capital, debt, interest, and dilution roll-forwards. The trusted source for free cash flow driver detail.", icon: "▤", color: "#E8D09B" },
    opmodel: { title: "Operating Model", desc: "Clean financial statement-style summary of historical and projected operating performance. Bridge between forecast mechanics and valuation.", icon: "▦", color: "#9BE8D0" },
    wacc: { title: "WACC", desc: "Cost of equity (CAPM), cost of debt, capital structure weights, final WACC. Tell the AI your risk-free rate, beta, ERP, and debt cost to calculate.", icon: "⊕", color: "#E8B8D0" },
    comps: { title: "Comps / Market Data", desc: "Peer company data, trading multiples (EV/EBITDA, EV/Revenue), and exit multiple support. Optional beta reference for WACC.", icon: "◎", color: "#98D4E8" },
    dcf: { title: "DCF Valuation", desc: "Core intrinsic valuation engine. UFCF calculation, discounting, terminal value, enterprise value bridge, implied share price. Ask the AI to run the full DCF once inputs are ready.", icon: "◆", color: "#E8C49B" },
    sensitivity: { title: "Sensitivity / Scenarios", desc: "WACC vs. terminal growth sensitivity tables, bull/base/bear scenario comparison, and valuation range outputs.", icon: "⊞", color: "#A8E898" },
    checks: { title: "Checks / Validation", desc: "Model health summary, missing input flags, reasonableness warnings (Pass / Warning / Fail). Monitors model integrity across all tabs.", icon: "✓", color: "#D0E898" },
  };
  const tab = info[tabId];
  if (!tab) return null;

  return (
    <div className="workbook-tab">
      <div className="workbook-header">
        <div className="workbook-icon-wrap" style={{ background: tab.color + "22", border: `1px solid ${tab.color}44` }}>
          <span style={{ fontSize: "22px", color: tab.color }}>{tab.icon}</span>
        </div>
        <div>
          <h1 className="workbook-title">{tab.title}</h1>
          <div className="workbook-subtitle">Workbook Tab</div>
        </div>
      </div>
      <div className="workbook-body">
        <div className="workbook-empty-state">
          <div className="empty-state-icon" style={{ color: tab.color }}>
            {tab.icon}
          </div>
          <p className="empty-state-desc">{tab.desc}</p>
          <div className="empty-state-hint">
            <SparkIcon />
            <span>Use the <strong>AI Assistant</strong> tab to build and calculate this section</span>
          </div>
        </div>
        <div className="workbook-tab-meta">
          <h3>What this tab does</h3>
          <div className="meta-grid">
            {getTabMeta(tabId).map((item, i) => (
              <div key={i} className="meta-item">
                <span className="meta-bullet" style={{ color: tab.color }}>→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTabMeta(tabId) {
  const meta = {
    dashboard: ["Displays enterprise value, equity value, implied share price", "Shows active scenario and key assumption summary", "Surfaces valuation range and scenario comparison", "Pulls final outputs from DCF, WACC, and Sensitivity tabs"],
    historical: ["Company metadata (name, ticker, industry, fiscal year)", "Historical income statement (3–5 years)", "Historical balance sheet and cash flow statement", "Supplemental data: shares, debt, cash, tax rates"],
    assumptions: ["Revenue growth assumptions by year (Base/Bull/Bear)", "Margin and expense assumptions", "Tax rate, capex%, D&A%, working capital%", "Terminal growth rate, exit multiple, WACC override"],
    revenue: ["Projects total revenue using growth assumptions", "Supports segment-based or total company build", "Shows revenue bridge from historical to projected", "Scenario-aware: Base, Bull, Bear revenue paths"],
    opforecast: ["Projects COGS, gross profit, SG&A, EBITDA", "Calculates EBIT and taxes → NOPAT", "Provides free cash flow driver summary", "Feeds Operating Model and DCF"],
    schedules: ["Capex schedule and D&A roll-forward", "Net working capital schedule", "Debt schedule and interest calculation", "Share count and dilution schedule"],
    opmodel: ["Clean statement-style presentation of operating results", "Historical and projected periods side by side", "DCF input summary section (EBIT, D&A, Capex, ΔNWC)", "Bridge between forecast mechanics and valuation"],
    wacc: ["Cost of equity via CAPM (Rf + β × ERP)", "After-tax cost of debt", "Capital structure weighting (debt/equity split)", "Single trusted WACC output for DCF"],
    comps: ["Peer company enterprise value and multiples", "EV/Revenue, EV/EBITDA, EV/EBIT by peer", "Median and mean summary statistics", "Selected exit multiple for terminal value"],
    dcf: ["UFCF = NOPAT + D&A − Capex − ΔNWC by year", "Discount factors and PV of each cash flow", "Terminal value (perpetuity growth or exit multiple)", "EV → Equity Value → Implied Share Price"],
    sensitivity: ["WACC vs. terminal growth rate sensitivity table", "WACC vs. exit multiple sensitivity table", "Bull / Base / Bear scenario comparison", "Valuation range and driver comparison"],
    checks: ["Missing input alerts (Fail level)", "Assumption reasonableness warnings", "WACC > terminal growth validation", "Overall model health: Healthy / Usable / Not Ready"],
  };
  return meta[tabId] || [];
}

// ─────────────────────────────────────────────
// CHAT VIEW
// ─────────────────────────────────────────────
function ChatView() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `# Welcome to DCF Model Bot

I'm your AI-powered discounted cash flow modeling assistant, built on Claude.

I'll guide you through building a complete, institutional-quality DCF model — from historical inputs to implied share price — while explaining every step along the way.

**What I can do for you:**
- Walk through a full DCF model step by step
- Calculate WACC, UFCF, terminal value, and implied share price from your data
- Run bull / base / bear scenarios and sensitivity analysis
- Explain every assumption, formula, and output in plain English
- Validate your model and flag anything that looks aggressive or inconsistent

**To get started, you can:**
- Tell me the company you want to value and I'll guide you through the data I need
- Paste in financial data directly and I'll start building
- Ask me to explain any concept (WACC, terminal value, UFCF, etc.)
- Use one of the quick prompts below

*The workbook tabs on the left show the full model architecture — use the AI here to populate and calculate each section.*`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="chat-view">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "assistant" ? <BotIcon /> : <UserIcon />}
            </div>
            <div className="message-bubble">
              {msg.role === "assistant"
                ? <div className="message-md">{renderMarkdown(msg.content)}</div>
                : <div className="message-text">{msg.content}</div>
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-assistant">
            <div className="message-avatar"><BotIcon /></div>
            <div className="message-bubble"><TypingIndicator /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((qp, i) => (
            <button key={i} className="quick-prompt-btn" onClick={() => send(qp.text)}>
              <SparkIcon />
              {qp.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-wrap">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKey}
            placeholder="Ask about your model, enter financial data, or request a calculation…"
            rows={1}
          />
          <button className="send-btn" onClick={() => send()} disabled={!input.trim() || loading}>
            <SendIcon />
          </button>
        </div>
        <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0D0F14;
          --surface: #13161D;
          --surface2: #1A1E28;
          --surface3: #21273A;
          --border: #2A3048;
          --border2: #333D5C;
          --text: #E8ECF4;
          --text2: #8892AA;
          --text3: #5A6480;
          --accent: #4F72FF;
          --accent2: #7B96FF;
          --accent-glow: rgba(79, 114, 255, 0.15);
          --gold: #E8B86D;
          --gold2: rgba(232, 184, 109, 0.12);
          --green: #5CC896;
          --red: #E86D6D;
          --sidebar-w: 240px;
          --font: 'Syne', sans-serif;
          --mono: 'DM Mono', monospace;
          --radius: 10px;
          --radius-sm: 6px;
        }

        html, body, #root { height: 100%; overflow: hidden; }
        body { background: var(--bg); color: var(--text); font-family: var(--font); }

        .app { display: flex; height: 100vh; overflow: hidden; }

        /* ─ SIDEBAR ─ */
        .sidebar {
          width: var(--sidebar-w);
          min-width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px 16px;
          border-bottom: 1px solid var(--border);
        }
        .logo-mark {
          background: var(--accent);
          color: #fff;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.05em;
          padding: 5px 7px;
          border-radius: 6px;
        }
        .logo-title { display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; line-height: 1.2; }
        .logo-sub { display: block; font-size: 10px; color: var(--text3); font-family: var(--mono); margin-top: 1px; }

        .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; scrollbar-width: none; }
        .sidebar-nav::-webkit-scrollbar { display: none; }

        .nav-divider {
          padding: 14px 16px 6px;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: var(--text3);
          font-family: var(--mono);
          font-weight: 500;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 7px 14px;
          background: none;
          border: none;
          color: var(--text2);
          font-family: var(--font);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 0;
          text-align: left;
          transition: all 0.15s;
          position: relative;
          letter-spacing: 0.01em;
        }
        .nav-item:hover { background: var(--surface2); color: var(--text); }
        .nav-item.active { background: var(--surface3); color: var(--text); }
        .nav-item.active::before {
          content: "";
          position: absolute;
          left: 0; top: 4px; bottom: 4px;
          width: 2px;
          background: var(--accent);
          border-radius: 0 2px 2px 0;
        }
        .nav-item.nav-ai { color: var(--accent2); }
        .nav-item.nav-ai:hover, .nav-item.nav-ai.active { background: var(--accent-glow); color: var(--accent2); }
        .nav-icon { font-size: 13px; width: 16px; text-align: center; flex-shrink: 0; opacity: 0.7; }
        .nav-label { flex: 1; }
        .nav-badge {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 500;
          background: var(--accent);
          color: #fff;
          padding: 2px 5px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .sidebar-footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border);
        }
        .sidebar-footer-text { font-size: 10px; color: var(--text3); font-family: var(--mono); }

        /* ─ MAIN AREA ─ */
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

        /* ─ CHAT ─ */
        .chat-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        .message {
          display: flex;
          gap: 12px;
          padding: 10px 28px;
          transition: background 0.1s;
        }
        .message-user { flex-direction: row-reverse; }
        .message:hover { background: rgba(255,255,255,0.015); }

        .message-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .message-assistant .message-avatar {
          background: var(--accent-glow);
          border: 1px solid rgba(79,114,255,0.3);
          color: var(--accent2);
        }
        .message-user .message-avatar {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text2);
        }

        .message-bubble { max-width: 760px; min-width: 0; flex: 1; }
        .message-user .message-bubble { max-width: 520px; }

        .message-text {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 14px;
          font-size: 14px;
          line-height: 1.6;
          display: inline-block;
        }

        .message-md { font-size: 14px; line-height: 1.7; color: var(--text); }
        .message-md h1, .message-md h2 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 16px 0 8px;
          letter-spacing: 0.01em;
        }
        .message-md h2:first-child, .message-md h1:first-child { margin-top: 0; }
        .message-md h3 {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent2);
          margin: 14px 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .message-md p { margin: 6px 0; color: var(--text); }
        .message-md ul, .message-md ol { padding-left: 20px; margin: 8px 0; }
        .message-md li { margin: 4px 0; color: var(--text); font-size: 14px; }
        .message-md strong { color: var(--gold); font-weight: 700; }
        .message-md em { color: var(--text2); font-style: italic; }
        .message-md code {
          font-family: var(--mono);
          font-size: 12.5px;
          background: var(--surface3);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 6px;
          color: var(--green);
        }
        .message-md pre {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          overflow-x: auto;
          margin: 10px 0;
        }
        .message-md pre code {
          background: none;
          border: none;
          padding: 0;
          font-size: 12.5px;
          line-height: 1.65;
          color: var(--accent2);
        }
        .message-md blockquote {
          border-left: 3px solid var(--accent);
          padding: 4px 12px;
          margin: 8px 0;
          color: var(--text2);
          font-style: italic;
        }
        .message-md hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 12px 0;
        }
        .table-wrap {
          overflow-x: auto;
          margin: 12px 0;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .message-md table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          font-family: var(--mono);
        }
        .message-md th {
          background: var(--surface3);
          color: var(--gold);
          font-weight: 500;
          padding: 8px 12px;
          text-align: left;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }
        .message-md td {
          padding: 7px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }
        .message-md tr:last-child td { border-bottom: none; }
        .message-md tr:nth-child(even) td { background: rgba(255,255,255,0.015); }

        /* Quick prompts */
        .quick-prompts {
          padding: 0 28px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .quick-prompt-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text2);
          font-family: var(--font);
          font-size: 12px;
          font-weight: 500;
          padding: 7px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.01em;
        }
        .quick-prompt-btn:hover {
          background: var(--surface3);
          border-color: var(--accent);
          color: var(--accent2);
        }
        .quick-prompt-btn svg { color: var(--accent); opacity: 0.7; }

        /* Input */
        .chat-input-area {
          padding: 16px 28px 20px;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .chat-input-wrap {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 12px;
          padding: 10px 10px 10px 16px;
          transition: border-color 0.15s;
        }
        .chat-input-wrap:focus-within { border-color: var(--accent); }
        .chat-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text);
          font-family: var(--font);
          font-size: 14px;
          line-height: 1.6;
          resize: none;
          min-height: 24px;
        }
        .chat-input::placeholder { color: var(--text3); }
        .send-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--accent);
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .send-btn:hover:not(:disabled) { background: var(--accent2); transform: scale(1.05); }
        .send-btn:disabled { background: var(--surface3); color: var(--text3); cursor: not-allowed; }
        .input-hint { font-size: 10px; color: var(--text3); font-family: var(--mono); margin-top: 6px; padding: 0 4px; }

        /* Typing */
        .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 6px 2px; }
        .typing-indicator span {
          width: 6px; height: 6px;
          background: var(--accent);
          border-radius: 50%;
          animation: bounce 1.2s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

        /* ─ WORKBOOK TABS ─ */
        .workbook-tab { height: 100%; overflow-y: auto; padding: 36px 40px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .workbook-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .workbook-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .workbook-title { font-size: 22px; font-weight: 800; letter-spacing: 0.01em; }
        .workbook-subtitle { font-size: 11px; color: var(--text3); font-family: var(--mono); margin-top: 3px; letter-spacing: 0.05em; text-transform: uppercase; }
        .workbook-body { display: flex; flex-direction: column; gap: 28px; }
        .workbook-empty-state {
          background: var(--surface);
          border: 1px dashed var(--border2);
          border-radius: var(--radius);
          padding: 40px 32px;
          text-align: center;
        }
        .empty-state-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.5; }
        .empty-state-desc { font-size: 14px; color: var(--text2); line-height: 1.7; max-width: 480px; margin: 0 auto 18px; }
        .empty-state-hint {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-family: var(--mono);
          color: var(--accent2);
          background: var(--accent-glow);
          border: 1px solid rgba(79,114,255,0.2);
          padding: 7px 14px;
          border-radius: 20px;
        }
        .workbook-tab-meta {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px 28px;
        }
        .workbook-tab-meta h3 {
          font-size: 11px;
          font-family: var(--mono);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 16px;
        }
        .meta-grid { display: flex; flex-direction: column; gap: 10px; }
        .meta-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text2); line-height: 1.5; }
        .meta-bullet { font-size: 12px; margin-top: 1px; flex-shrink: 0; font-family: var(--mono); }

        /* scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--border2); }
      `}</style>

      <div className="app">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="main">
          {activeTab === "chat" ? (
            <ChatView />
          ) : (
            <WorkbookTab tabId={activeTab} />
          )}
        </div>
      </div>
    </>
  );
}
