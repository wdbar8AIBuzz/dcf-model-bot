# DCF Model Bot

An AI-powered Discounted Cash Flow (DCF) modeling assistant built on Claude. Guides users through building institutional-quality financial valuations step by step — from raw historical data to implied share price.

---

## What It Does

DCF Model Bot combines a structured financial workbook interface with a conversational AI assistant. Users can walk through a complete DCF model interactively, with the AI handling calculations, explaining assumptions, and flagging issues in real time.

**Core capabilities:**
- Step-by-step DCF model walkthrough (company setup → historical inputs → forecast → valuation)
- Live WACC calculation using CAPM
- Unlevered Free Cash Flow (UFCF) computation
- Terminal value via perpetuity growth method and/or exit multiple
- Enterprise value → equity value → implied share price
- Bull / base / bear scenario analysis
- WACC vs. terminal growth sensitivity tables
- Model validation (flags missing inputs, aggressive assumptions, WACC ≤ growth rate errors)

---

## Tech Stack

- **React** (JSX) — single-file component architecture
- **Claude API** (`claude-sonnet-4-20250514`) — conversational AI backbone
- **Custom markdown renderer** — built from scratch to handle tables, code blocks, headers, and inline formatting returned by the model
- **CSS variables** — dark-mode financial UI with consistent design tokens
- **No external UI libraries** — all components hand-built

---

## Architecture

```
dcf-model-bot.jsx
├── SYSTEM_PROMPT          # Full DCF modeling instructions, formulas, and validation rules
├── renderMarkdown()       # Custom markdown → React elements parser
├── inlineFormat()         # Bold, italic, code inline formatting
├── Sidebar                # 13-tab workbook navigation
├── WorkbookTab            # Placeholder tabs for each model section
├── ChatView               # Main AI chat interface with conversation history
│   ├── Anthropic API call # Stateful multi-turn conversation
│   └── Quick prompts      # Pre-built prompts for common workflows
└── Styles                 # Scoped CSS with design system variables
```

**Workbook tab structure mirrors a real financial model:**
Dashboard → Historical Inputs → Assumptions → Revenue Build → Operating Forecast → Supporting Schedules → Operating Model → WACC → Comps → DCF Valuation → Sensitivity/Scenarios → Checks/Validation

---

## Key Financial Logic (in System Prompt)

| Formula | Implementation |
|---|---|
| Cost of Equity | `Rf + β × ERP` (CAPM) |
| After-Tax Cost of Debt | `Kd × (1 − Tax Rate)` |
| WACC | `(E/V × Ke) + (D/V × Kd_after_tax)` |
| UFCF | `NOPAT + D&A − Capex − ΔNWC` |
| Terminal Value (Gordon Growth) | `UFCF × (1+g) / (WACC − g)` |
| Terminal Value (Exit Multiple) | `EBITDA × Multiple` |
| Enterprise Value | `PV(UFCFs) + PV(Terminal Value)` |
| Implied Share Price | `(EV + Cash − Debt) / Diluted Shares` |

---

## Running the App

### Option 1 — Claude Artifact Environment (no setup required)
This app was built for and runs natively inside [Claude.ai](https://claude.ai). Paste the contents of `dcf-model-bot.jsx` into a Claude chat as an artifact and it works instantly — API authentication is handled automatically by the environment.

### Option 2 — Run Locally with Your Own API Key

1. Scaffold a React app:
```bash
npx create-react-app dcf-bot
cd dcf-bot
```

2. Replace `src/App.js` with `dcf-model-bot.jsx`

3. In the `send()` function, add your Anthropic API key to the fetch headers:
```javascript
headers: {
  "Content-Type": "application/json",
  "x-api-key": "YOUR_ANTHROPIC_API_KEY_HERE",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true"
},
```

4. Get an API key at [console.anthropic.com](https://console.anthropic.com)

5. Run the app:
```bash
npm start
```

> **Note:** Never commit your API key to source control. Use environment variables (e.g. `process.env.REACT_APP_ANTHROPIC_KEY`) in any shared or deployed version.

---

## Example Usage

**Start a full DCF from scratch:**
> "I want to build a DCF model for [company]. Here's my historical data..."

**Run a pre-loaded example (Apple FY2023):**
> Use the "Run Apple DCF" quick prompt — feeds real revenue, EBITDA, capex, debt, share count, and WACC inputs and walks through the full model

**Ask conceptual questions:**
> "Explain WACC in plain English" / "What's the difference between Gordon Growth and exit multiple terminal value?"

---

## Files

| File | Description |
|---|---|
| `dcf-model-bot.jsx` | Full React application — UI, AI integration, markdown renderer |
| `DCF_Model_Bot_System_Prompt.md` | Standalone system prompt — DCF workflow, formulas, validation rules, output format |

---

## Author

Will Dunbar — Finance & AI  
University of Minnesota  
[LinkedIn](https://www.linkedin.com/in/williamdunbar8) • [GitHub](https://github.com/wdbar8AIBuzz)
