'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'
import { FiUpload, FiFile, FiX, FiSend, FiShield, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiMessageSquare, FiPieChart, FiBarChart2, FiActivity, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import { HiOutlineSparkles, HiOutlineLightBulb } from 'react-icons/hi'
import { RiGhostLine, RiMoneyDollarCircleLine } from 'react-icons/ri'
import { BiWallet } from 'react-icons/bi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

// --- Constants ---
const AGENT_ID = '699b3959297d26c03fdeb117'
const RAG_ID = '699b393f3dc9e9e528285c8b'

const CATEGORY_COLORS = [
  'hsl(270, 80%, 65%)',
  'hsl(340, 75%, 55%)',
  'hsl(200, 80%, 55%)',
  'hsl(160, 70%, 45%)',
  'hsl(35, 90%, 55%)',
  'hsl(300, 60%, 50%)',
  'hsl(180, 70%, 45%)',
  'hsl(45, 85%, 55%)',
  'hsl(220, 70%, 60%)',
  'hsl(0, 70%, 55%)',
  'hsl(130, 60%, 45%)',
]

// --- Interfaces ---
interface SpendingCategory {
  category: string
  amount: number
  percentage: number
  transaction_count: number
}

interface GhostSubscription {
  name: string
  amount: number
  frequency: string
}

interface MonthlyTrend {
  period: string
  spending: number
  income: number
}

interface DashboardData {
  analysis_type: string
  spending_categories: SpendingCategory[]
  total_spending: number
  total_income: number
  ghost_subscriptions: GhostSubscription[]
  financial_health_score: number
  savings_rate: number
  chat_response: string
  recommendations: string[]
  monthly_trend: MonthlyTrend[]
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
}

// --- Sample Data ---
const SAMPLE_DATA: DashboardData = {
  analysis_type: 'dashboard',
  spending_categories: [
    { category: 'Housing', amount: 1800, percentage: 35, transaction_count: 1 },
    { category: 'Food & Dining', amount: 620, percentage: 12, transaction_count: 34 },
    { category: 'Transportation', amount: 340, percentage: 7, transaction_count: 12 },
    { category: 'Entertainment', amount: 280, percentage: 5, transaction_count: 8 },
    { category: 'Shopping', amount: 450, percentage: 9, transaction_count: 15 },
    { category: 'Utilities', amount: 220, percentage: 4, transaction_count: 4 },
    { category: 'Healthcare', amount: 150, percentage: 3, transaction_count: 2 },
    { category: 'Subscriptions', amount: 89.97, percentage: 2, transaction_count: 5 },
    { category: 'Transfers', amount: 500, percentage: 10, transaction_count: 3 },
    { category: 'Other', amount: 200, percentage: 4, transaction_count: 7 },
  ],
  total_spending: 4649.97,
  total_income: 6500,
  ghost_subscriptions: [
    { name: 'Streaming Service A', amount: 15.99, frequency: 'Monthly' },
    { name: 'Cloud Storage', amount: 9.99, frequency: 'Monthly' },
    { name: 'Music Subscription', amount: 10.99, frequency: 'Monthly' },
    { name: 'News App', amount: 4.99, frequency: 'Monthly' },
    { name: 'Fitness App', amount: 14.99, frequency: 'Monthly' },
  ],
  financial_health_score: 72,
  savings_rate: 28.5,
  chat_response: '',
  recommendations: [
    'Cancel unused subscriptions to save $46.96/month ($563.52/year). The News App and Fitness App show minimal usage patterns.',
    'Reduce dining out by 20% to save $124/month. Consider meal prepping on weekends.',
    'Set up automatic transfers of $200/month to a high-yield savings account to build your emergency fund.',
    'Review your entertainment spending - consolidating streaming services could save $25/month.',
  ],
  monthly_trend: [
    { period: 'Jan', spending: 4200, income: 6500 },
    { period: 'Feb', spending: 4650, income: 6500 },
    { period: 'Mar', spending: 3800, income: 6500 },
  ],
}

// --- Utilities ---
function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getHealthLabel(score: number): string {
  if (score >= 76) return 'Excellent'
  if (score >= 51) return 'Good'
  if (score >= 26) return 'Fair'
  return 'Poor'
}

function getHealthColor(score: number): string {
  if (score >= 76) return 'hsl(160, 70%, 45%)'
  if (score >= 51) return 'hsl(200, 80%, 55%)'
  if (score >= 26) return 'hsl(35, 90%, 55%)'
  return 'hsl(0, 80%, 55%)'
}

function generatePieGradient(categories: SpendingCategory[]): string {
  if (!Array.isArray(categories) || categories.length === 0) {
    return 'conic-gradient(hsl(260, 15%, 20%) 0% 100%)'
  }
  let cumulative = 0
  const stops = categories.map((cat, i) => {
    const start = cumulative
    cumulative += (cat.percentage ?? 0)
    return `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} ${start}% ${cumulative}%`
  })
  if (cumulative < 100) {
    stops.push(`hsl(260, 15%, 20%) ${cumulative}% 100%`)
  }
  return `conic-gradient(${stops.join(', ')})`
}

// --- Markdown Renderer ---
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// --- Parse Agent Response ---
function parseAgentResponse(result: Record<string, unknown> | null | undefined): DashboardData {
  const agentResult = (result as Record<string, unknown>) ?? {}
  return {
    analysis_type: (agentResult?.analysis_type as string) ?? 'dashboard',
    spending_categories: Array.isArray(agentResult?.spending_categories) ? agentResult.spending_categories as SpendingCategory[] : [],
    total_spending: typeof agentResult?.total_spending === 'number' ? agentResult.total_spending : 0,
    total_income: typeof agentResult?.total_income === 'number' ? agentResult.total_income : 0,
    ghost_subscriptions: Array.isArray(agentResult?.ghost_subscriptions) ? agentResult.ghost_subscriptions as GhostSubscription[] : [],
    financial_health_score: typeof agentResult?.financial_health_score === 'number' ? agentResult.financial_health_score : 0,
    savings_rate: typeof agentResult?.savings_rate === 'number' ? agentResult.savings_rate : 0,
    chat_response: (agentResult?.chat_response as string) ?? '',
    recommendations: Array.isArray(agentResult?.recommendations) ? agentResult.recommendations as string[] : [],
    monthly_trend: Array.isArray(agentResult?.monthly_trend) ? agentResult.monthly_trend as MonthlyTrend[] : [],
  }
}

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// === StatCard Component ===
function StatCard({ icon, label, value, subtext, iconBg }: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  iconBg: string
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
          </div>
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: iconBg }}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// === DonutChart Component ===
function DonutChart({ categories }: { categories: SpendingCategory[] }) {
  const safe = Array.isArray(categories) ? categories : []
  const gradient = generatePieGradient(safe)

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="relative flex-shrink-0">
        <div
          style={{ background: gradient, width: 200, height: 200, borderRadius: '50%' }}
          className="shadow-lg shadow-primary/10"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-background flex items-center justify-center">
            <FiPieChart className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 flex-1 w-full">
        {safe.map((cat, i) => (
          <div key={cat?.category ?? i} className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground truncate font-medium">{cat?.category ?? 'Unknown'}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{cat?.percentage ?? 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(cat?.amount ?? 0)} -- {cat?.transaction_count ?? 0} txn{(cat?.transaction_count ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// === GhostSubscriptions Component ===
function GhostSubscriptionsCard({ subscriptions }: { subscriptions: GhostSubscription[] }) {
  const safe = Array.isArray(subscriptions) ? subscriptions : []
  const total = safe.reduce((acc, s) => acc + (s?.amount ?? 0), 0)
  const isWarning = total > 50

  if (safe.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <RiGhostLine className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No ghost subscriptions detected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-border ${isWarning ? 'border-destructive/40' : 'bg-card'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isWarning ? 'bg-destructive/15' : 'bg-accent/15'}`}>
            <RiGhostLine className={`h-5 w-5 ${isWarning ? 'text-destructive' : 'text-accent'}`} />
          </div>
          <div>
            <CardTitle className="text-base">Ghost Subscriptions</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Recurring charges detected</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {safe.map((sub, i) => (
          <div key={sub?.name ?? i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">{sub?.name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{sub?.frequency ?? 'Unknown'}</p>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(sub?.amount ?? 0)}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <div className="flex items-center justify-between px-3">
          <span className="text-sm font-medium text-muted-foreground">Total recurring</span>
          <span className={`text-base font-bold ${isWarning ? 'text-destructive' : 'text-foreground'}`}>
            {formatCurrency(total)}/mo
          </span>
        </div>
        {isWarning && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2.5 bg-destructive/10 rounded-lg">
            <FiAlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">Over $50/month in recurring subscriptions detected</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// === HealthBar Component ===
function HealthBar({ score }: { score: number }) {
  const safeScore = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  const color = getHealthColor(safeScore)
  const label = getHealthLabel(safeScore)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FiActivity className="h-4 w-4 text-primary" />
            Financial Health Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color }}>{safeScore}</span>
            <Badge variant="secondary" className="text-xs" style={{ borderColor: color, color }}>{label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${safeScore}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">0 - Poor</span>
          <span className="text-xs text-muted-foreground">100 - Excellent</span>
        </div>
      </CardContent>
    </Card>
  )
}

// === Recommendations Component ===
function RecommendationsSection({ recommendations }: { recommendations: string[] }) {
  const safe = Array.isArray(recommendations) ? recommendations : []
  if (safe.length === 0) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HiOutlineLightBulb className="h-5 w-5 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {safe.map((rec, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
            <FiChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{rec}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// === MonthlyTrendChart Component ===
function MonthlyTrendChart({ trends }: { trends: MonthlyTrend[] }) {
  const safe = Array.isArray(trends) ? trends : []
  if (safe.length === 0) return null

  const maxVal = Math.max(
    ...safe.map(t => Math.max(t?.spending ?? 0, t?.income ?? 0)),
    1
  )

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FiBarChart2 className="h-4 w-4 text-primary" />
          Monthly Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-6 justify-around px-4" style={{ height: 180 }}>
          {safe.map((t, i) => {
            const spendPct = ((t?.spending ?? 0) / maxVal) * 100
            const incomePct = ((t?.income ?? 0) / maxVal) * 100
            return (
              <div key={t?.period ?? i} className="flex flex-col items-center gap-1 flex-1 max-w-24">
                <div className="flex items-end gap-2 w-full justify-center" style={{ height: 140 }}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(t?.income ?? 0)}</span>
                    <div
                      className="w-full max-w-8 rounded-t-md transition-all duration-500"
                      style={{ height: `${incomePct}%`, backgroundColor: 'hsl(160, 70%, 45%)', minHeight: 4 }}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(t?.spending ?? 0)}</span>
                    <div
                      className="w-full max-w-8 rounded-t-md transition-all duration-500"
                      style={{ height: `${spendPct}%`, backgroundColor: 'hsl(340, 75%, 55%)', minHeight: 4 }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-medium mt-1">{t?.period ?? ''}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(160, 70%, 45%)' }} />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(340, 75%, 55%)' }} />
            <span className="text-xs text-muted-foreground">Spending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// === ChatSidebar Component ===
function ChatSidebar({
  isOpen,
  onClose,
  messages,
  setMessages,
  onDashboardUpdate,
  setActiveAgentId,
}: {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  onDashboardUpdate: (data: DashboardData) => void
  setActiveAgentId: (id: string | null) => void
}) {
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestedPrompts = [
    'What was my highest expense?',
    'Find recurring charges',
    'Give me a 30-day savings plan',
    'Where can I save $200 this month?',
  ]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isSending) return
    const userMsg: ChatMessage = { role: 'user', content: message.trim() }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsSending(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(message.trim(), AGENT_ID)
      if (result?.success) {
        const agentResult = result?.response?.result
        const chatText = (agentResult?.chat_response as string)
          ?? (Array.isArray(agentResult?.recommendations) ? (agentResult.recommendations as string[]).join('\n') : '')
          || 'Analysis complete. Please check the dashboard for updated data.'

        setMessages(prev => [...prev, { role: 'agent', content: chatText }])

        if (Array.isArray(agentResult?.spending_categories) && (agentResult.spending_categories as SpendingCategory[]).length > 0) {
          onDashboardUpdate(parseAgentResponse(agentResult))
        }
      } else {
        setMessages(prev => [...prev, { role: 'agent', content: 'Sorry, I could not process that request. Please try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'agent', content: 'An error occurred. Please try again.' }])
    } finally {
      setIsSending(false)
      setActiveAgentId(null)
    }
  }, [isSending, setMessages, onDashboardUpdate, setActiveAgentId])

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l border-border z-50 flex flex-col shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <HiOutlineSparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Talk to Your Data</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <FiX className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-4 mt-8">
            <p className="text-sm text-muted-foreground text-center">Ask anything about your finances</p>
            <div className="space-y-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors border border-border/50"
                >
                  <span className="text-primary mr-2">--</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md' : 'bg-muted text-foreground rounded-2xl rounded-bl-md'}`}>
                {msg.role === 'agent' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(chatInput)
              }
            }}
            placeholder="Ask about your finances..."
            disabled={isSending}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            onClick={() => sendMessage(chatInput)}
            disabled={isSending || !chatInput.trim()}
            size="sm"
            className="px-3 h-10"
          >
            <FiSend className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// === Upload Hub Screen ===
function UploadHub({
  onAnalyzed,
  isUploading,
  setIsUploading,
  uploadStatus,
  setUploadStatus,
  fileUploaded,
  setFileUploaded,
  uploadedFileName,
  setUploadedFileName,
  isAnalyzing,
  setIsAnalyzing,
}: {
  onAnalyzed: (data: DashboardData) => void
  isUploading: boolean
  setIsUploading: (v: boolean) => void
  uploadStatus: string
  setUploadStatus: (v: string) => void
  fileUploaded: boolean
  setFileUploaded: (v: boolean) => void
  uploadedFileName: string
  setUploadedFileName: (v: string) => void
  isAnalyzing: boolean
  setIsAnalyzing: (v: boolean) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    const validExtensions = ['.pdf', '.csv', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      setUploadStatus('Invalid file type. Please upload PDF, CSV, or TXT files.')
      return
    }

    setIsUploading(true)
    setUploadStatus('Uploading and processing your statement...')
    setUploadedFileName(file.name)

    try {
      await uploadAndTrainDocument(RAG_ID, file)
      setFileUploaded(true)
      setUploadStatus('Statement uploaded and processed successfully.')
    } catch {
      setUploadStatus('Upload failed. Please try again.')
      setFileUploaded(false)
    } finally {
      setIsUploading(false)
    }
  }, [setIsUploading, setUploadStatus, setFileUploaded, setUploadedFileName])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setUploadStatus('Analyzing your financial data...')
    try {
      const message = 'Analyze my bank statement. Provide a complete spending breakdown by category (Food & Dining, Housing, Transportation, Entertainment, Shopping, Utilities, Healthcare, Subscriptions, Income, Transfers, Other). Detect all ghost subscriptions (recurring small charges). Calculate my financial health score and savings rate. Provide at least 3 specific savings recommendations with dollar amounts.'
      const result = await callAIAgent(message, AGENT_ID)
      if (result?.success) {
        const data = parseAgentResponse(result?.response?.result)
        onAnalyzed(data)
      } else {
        setUploadStatus('Analysis failed. Please try again.')
      }
    } catch {
      setUploadStatus('Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [onAnalyzed, setIsAnalyzing, setUploadStatus])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo and title */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
              <BiWallet className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">WealthWise</h1>
          </div>
          <p className="text-muted-foreground text-lg">Your Private Financial Command Center</p>
        </div>

        {/* Privacy Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="px-4 py-2 text-sm gap-2 bg-secondary/80 border border-border">
            <FiShield className="h-4 w-4 text-primary" />
            100% Private - No Personal Data Stored
          </Badge>
        </div>

        {/* Dropzone */}
        <Card className={`border-2 border-dashed transition-colors bg-card/50 ${isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
          <CardContent className="p-0">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !fileUploaded && fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer rounded-xl"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
              {fileUploaded ? (
                <>
                  <div className="p-4 rounded-full bg-primary/20 mb-4">
                    <FiFile className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-1">{uploadedFileName}</p>
                  <p className="text-sm text-muted-foreground">File ready for analysis</p>
                </>
              ) : isUploading ? (
                <>
                  <div className="p-4 rounded-full bg-primary/20 mb-4">
                    <FiRefreshCw className="h-10 w-10 text-primary animate-spin" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-1">Processing...</p>
                  <p className="text-sm text-muted-foreground">{uploadedFileName}</p>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <FiUpload className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium text-lg mb-1">Drop your bank statement here</p>
                  <p className="text-sm text-muted-foreground">PDF, CSV, or TXT supported</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status message */}
        {uploadStatus && (
          <div className={`text-center text-sm px-4 py-3 rounded-xl ${fileUploaded && !isAnalyzing ? 'bg-primary/10 text-primary' : isUploading || isAnalyzing ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
            {uploadStatus}
          </div>
        )}

        {/* Analyze button */}
        {fileUploaded && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full h-12 text-base font-semibold gap-2"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <FiRefreshCw className="h-5 w-5 animate-spin" />
                Analyzing Your Finances...
              </>
            ) : (
              <>
                <FiActivity className="h-5 w-5" />
                Analyze Statement
              </>
            )}
          </Button>
        )}

        {/* Agent info */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Powered by Wealth Architect Agent</p>
        </div>
      </div>
    </div>
  )
}

// === Dashboard Header ===
function DashboardHeader({
  onUploadNew,
  isSample,
  useSample,
  onToggleSample,
}: {
  onUploadNew: () => void
  isSample: boolean
  useSample: boolean
  onToggleSample: () => void
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
            <BiWallet className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">WealthWise</h1>
          {isSample && <Badge variant="secondary" className="text-xs">Sample Data</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Sample Data</span>
            <button
              onClick={onToggleSample}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${useSample ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${useSample ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onUploadNew} className="gap-2 text-xs">
            <FiUpload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Statement</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

// === Main Page ===
export default function Page() {
  const [screen, setScreen] = useState<'upload' | 'dashboard'>('upload')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [useSample, setUseSample] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [fileUploaded, setFileUploaded] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSampleMode, setIsSampleMode] = useState(false)

  const handleAnalyzed = useCallback((data: DashboardData) => {
    setDashboardData(data)
    setScreen('dashboard')
    setIsSampleMode(false)
  }, [])

  const handleUploadNew = useCallback(() => {
    setScreen('upload')
    setFileUploaded(false)
    setUploadedFileName('')
    setUploadStatus('')
    setIsUploading(false)
    setIsAnalyzing(false)
    setChatMessages([])
    setDashboardData(null)
    setUseSample(false)
    setIsSampleMode(false)
    setChatOpen(false)
  }, [])

  const handleSampleToggle = useCallback(() => {
    const next = !useSample
    setUseSample(next)
    if (next) {
      setDashboardData(SAMPLE_DATA)
      setScreen('dashboard')
      setIsSampleMode(true)
    } else {
      setDashboardData(null)
      setScreen('upload')
      setIsSampleMode(false)
      setChatMessages([])
      setChatOpen(false)
    }
  }, [useSample])

  const handleDashboardUpdate = useCallback((data: DashboardData) => {
    setDashboardData(data)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Upload screen sample toggle */}
        {screen === 'upload' && (
          <div className="fixed top-4 right-4 z-50">
            <div className="flex items-center gap-3 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2.5 border border-border shadow-lg">
              <span className="text-xs text-muted-foreground font-medium">Sample Data</span>
              <button
                onClick={handleSampleToggle}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${useSample ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${useSample ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}

        {screen === 'upload' && (
          <UploadHub
            onAnalyzed={handleAnalyzed}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            uploadStatus={uploadStatus}
            setUploadStatus={setUploadStatus}
            fileUploaded={fileUploaded}
            setFileUploaded={setFileUploaded}
            uploadedFileName={uploadedFileName}
            setUploadedFileName={setUploadedFileName}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        )}

        {screen === 'dashboard' && dashboardData && (
          <div className={`min-h-screen transition-all duration-300 ${chatOpen ? 'sm:pr-96' : ''}`}>
            <DashboardHeader
              onUploadNew={handleUploadNew}
              isSample={isSampleMode}
              useSample={useSample}
              onToggleSample={handleSampleToggle}
            />

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<RiMoneyDollarCircleLine className="h-5 w-5" style={{ color: 'hsl(160, 70%, 45%)' }} />}
                  label="Total Income"
                  value={formatCurrency(dashboardData?.total_income ?? 0)}
                  iconBg="hsla(160, 70%, 45%, 0.15)"
                />
                <StatCard
                  icon={<FiTrendingDown className="h-5 w-5" style={{ color: 'hsl(340, 75%, 55%)' }} />}
                  label="Total Spending"
                  value={formatCurrency(dashboardData?.total_spending ?? 0)}
                  subtext={`${Array.isArray(dashboardData?.spending_categories) ? dashboardData.spending_categories.reduce((a, c) => a + (c?.transaction_count ?? 0), 0) : 0} transactions`}
                  iconBg="hsla(340, 75%, 55%, 0.15)"
                />
                <StatCard
                  icon={<FiTrendingUp className="h-5 w-5" style={{ color: 'hsl(200, 80%, 55%)' }} />}
                  label="Savings Rate"
                  value={`${(dashboardData?.savings_rate ?? 0).toFixed(1)}%`}
                  subtext={`${formatCurrency((dashboardData?.total_income ?? 0) - (dashboardData?.total_spending ?? 0))} saved`}
                  iconBg="hsla(200, 80%, 55%, 0.15)"
                />
                <StatCard
                  icon={<FiActivity className="h-5 w-5" style={{ color: getHealthColor(dashboardData?.financial_health_score ?? 0) }} />}
                  label="Health Score"
                  value={`${dashboardData?.financial_health_score ?? 0}/100`}
                  subtext={getHealthLabel(dashboardData?.financial_health_score ?? 0)}
                  iconBg={`${getHealthColor(dashboardData?.financial_health_score ?? 0)}26`}
                />
              </div>

              {/* Health Bar */}
              <HealthBar score={dashboardData?.financial_health_score ?? 0} />

              {/* Spending Breakdown */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FiPieChart className="h-4 w-4 text-primary" />
                    Spending Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <DonutChart categories={dashboardData?.spending_categories ?? []} />
                </CardContent>
              </Card>

              {/* Two column: Ghost + Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GhostSubscriptionsCard subscriptions={dashboardData?.ghost_subscriptions ?? []} />
                <RecommendationsSection recommendations={dashboardData?.recommendations ?? []} />
              </div>

              {/* Monthly Trend */}
              <MonthlyTrendChart trends={dashboardData?.monthly_trend ?? []} />

              {/* Agent Info Footer */}
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                        <span className="text-xs text-muted-foreground font-medium">Wealth Architect Agent</span>
                      </div>
                      <span className="text-xs text-muted-foreground">|</span>
                      <span className="text-xs text-muted-foreground">Financial analysis and coaching</span>
                    </div>
                    <Badge variant="secondary" className="text-xs gap-1.5">
                      <FiShield className="h-3 w-3" />
                      Private
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </main>

            {/* Chat FAB */}
            {!chatOpen && (
              <button
                onClick={() => setChatOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <FiMessageSquare className="h-6 w-6" />
              </button>
            )}

            {/* Chat Sidebar */}
            <ChatSidebar
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              messages={chatMessages}
              setMessages={setChatMessages}
              onDashboardUpdate={handleDashboardUpdate}
              setActiveAgentId={setActiveAgentId}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
