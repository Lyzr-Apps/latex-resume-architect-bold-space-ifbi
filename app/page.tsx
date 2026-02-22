'use client'

import React, { useState, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'
import { FiUpload, FiCopy, FiDownload, FiFile, FiX, FiCheck, FiCode, FiAlertTriangle, FiChevronDown, FiChevronUp, FiTerminal, FiZap } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const AGENT_ID = '699b358bf505f1398ce6c2a7'
const RAG_ID = '699b357a3dc9e9e528285c87'

// --- Types ---
interface AgentResult {
  latex_code?: string
  template_type?: string
  sections_mapped?: string[]
  missing_sections?: string[]
  keywords_injected?: string[]
}

interface ArtifactFile {
  file_url?: string
  name?: string
  format_type?: string
}

// --- Sample Data ---
const SAMPLE_JD = `Senior Software Engineer - Full Stack

We are looking for an experienced Senior Software Engineer with expertise in React, Node.js, TypeScript, and cloud infrastructure (AWS/GCP). The ideal candidate will have 5+ years of experience building scalable web applications, strong knowledge of CI/CD pipelines, containerization (Docker, Kubernetes), and database design (PostgreSQL, MongoDB). Experience with microservices architecture and event-driven systems is highly valued. Leadership experience mentoring junior developers is a plus.

Requirements:
- BS/MS in Computer Science or related field
- 5+ years of professional software development experience
- Proficiency in React, TypeScript, Node.js
- Experience with cloud platforms (AWS or GCP)
- Strong understanding of system design and architecture
- Excellent communication skills`

const SAMPLE_RESULT: AgentResult = {
  latex_code: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{banking}
\\moderncvcolor{blue}

\\usepackage[scale=0.75]{geometry}

\\name{Jane}{Doe}
\\title{Senior Software Engineer}
\\address{San Francisco, CA}
\\phone[mobile]{+1~(555)~000~0000}
\\email{jane.doe@email.com}
\\homepage{janedoe.dev}
\\social[linkedin]{janedoe}
\\social[github]{janedoe}

\\begin{document}
\\makecvtitle

\\section{Summary}
Experienced Senior Software Engineer with 7+ years building scalable
web applications using React, TypeScript, and Node.js. Proven track
record in cloud infrastructure (AWS), microservices architecture, and
leading cross-functional engineering teams.

\\section{Experience}
\\cventry{2020--Present}{Senior Software Engineer}{TechCorp Inc.}
{San Francisco, CA}{}{
\\begin{itemize}
\\item Architected and deployed microservices on AWS using Docker and
Kubernetes, reducing deployment time by 60\\%
\\item Led a team of 5 engineers in building a React/TypeScript
frontend serving 2M+ monthly active users
\\item Designed event-driven systems using Kafka and PostgreSQL,
handling 10K+ events per second
\\item Implemented CI/CD pipelines with GitHub Actions, achieving
99.9\\% deployment success rate
\\end{itemize}
}

\\cventry{2017--2020}{Software Engineer}{StartupXYZ}
{New York, NY}{}{
\\begin{itemize}
\\item Built full-stack applications with React, Node.js, and MongoDB
\\item Migrated legacy monolith to microservices architecture on GCP
\\item Mentored 3 junior developers through code reviews and pair
programming sessions
\\end{itemize}
}

\\section{Education}
\\cventry{2013--2017}{B.S. Computer Science}{Stanford University}
{Stanford, CA}{GPA: 3.8}{}

\\section{Skills}
\\cvitem{Languages}{TypeScript, JavaScript, Python, Go, SQL}
\\cvitem{Frontend}{React, Next.js, Redux, Tailwind CSS}
\\cvitem{Backend}{Node.js, Express, GraphQL, REST APIs}
\\cvitem{Cloud \\& DevOps}{AWS (EC2, S3, Lambda, ECS), Docker,
Kubernetes, Terraform, CI/CD}
\\cvitem{Databases}{PostgreSQL, MongoDB, Redis, DynamoDB}
\\cvitem{Architecture}{Microservices, Event-Driven, System Design}

\\section{Certifications}
\\cvlistitem{AWS Solutions Architect -- Associate}
\\cvlistitem{Google Cloud Professional Developer}

\\end{document}`,
  template_type: 'ModernCV',
  sections_mapped: ['Summary', 'Experience', 'Education', 'Skills', 'Certifications'],
  missing_sections: ['Publications', 'Volunteer Work'],
  keywords_injected: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'microservices', 'CI/CD', 'PostgreSQL', 'MongoDB', 'system design', 'mentoring'],
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
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
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

// --- Syntax Highlighter ---
function highlightLatex(code: string): React.ReactNode[] {
  const lines = code.split('\n')
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = []

    // Check for comments (unescaped %)
    const commentIdx = line.indexOf('%')
    if (commentIdx !== -1 && (commentIdx === 0 || line[commentIdx - 1] !== '\\')) {
      const before = line.slice(0, commentIdx)
      const comment = line.slice(commentIdx)
      if (before) parts.push(...highlightLine(before, i))
      parts.push(
        <span key={`c-${i}`} className="text-muted-foreground italic">{comment}</span>
      )
      return (
        <div key={i} className="flex hover:bg-secondary/50 transition-colors">
          <span className="inline-block w-12 text-right pr-4 select-none text-muted-foreground text-xs leading-6 flex-shrink-0">{i + 1}</span>
          <span className="flex-1 leading-6">{parts}</span>
        </div>
      )
    }

    parts.push(...highlightLine(line, i))
    return (
      <div key={i} className="flex hover:bg-secondary/50 transition-colors">
        <span className="inline-block w-12 text-right pr-4 select-none text-muted-foreground text-xs leading-6 flex-shrink-0">{i + 1}</span>
        <span className="flex-1 leading-6">{parts.length > 0 ? parts : '\u00A0'}</span>
      </div>
    )
  })
}

function highlightLine(text: string, lineIdx: number): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\\(?:begin|end)\{[^}]*\})|(\\[a-zA-Z@]+)(\[[^\]]*\])?(\{[^}]*\})?/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  match = regex.exec(text)
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${lineIdx}-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }

    if (match[1]) {
      parts.push(
        <span key={`e-${lineIdx}-${match.index}`} style={{ color: 'hsl(190, 81%, 67%)' }}>{match[1]}</span>
      )
    } else if (match[2]) {
      parts.push(
        <span key={`cmd-${lineIdx}-${match.index}`} style={{ color: 'hsl(80, 80%, 50%)' }}>{match[2]}</span>
      )
      if (match[3]) {
        parts.push(
          <span key={`opt-${lineIdx}-${match.index}`} style={{ color: 'hsl(35, 100%, 50%)' }}>{match[3]}</span>
        )
      }
      if (match[4]) {
        parts.push(
          <span key={`arg-${lineIdx}-${match.index}`} style={{ color: 'hsl(261, 100%, 75%)' }}>{match[4]}</span>
        )
      }
    }

    lastIndex = match.index + match[0].length
    match = regex.exec(text)
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`r-${lineIdx}-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return parts
}

// --- File Drop Zone ---
function FileDropZone({
  file,
  onFile,
  onRemove,
  uploadStatus,
  uploading,
}: {
  file: File | null
  onFile: (f: File) => void
  onRemove: () => void
  uploadStatus: string
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) onFile(dropped)
    },
    [onFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (file) {
    return (
      <div className="border border-border bg-secondary p-4 space-y-3" style={{ borderRadius: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-muted flex items-center justify-center" style={{ borderRadius: 0 }}>
              <FiFile className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate font-mono">{file.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{formatSize(file.size)}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="flex-shrink-0 text-muted-foreground hover:text-destructive" style={{ borderRadius: 0 }}>
            <FiX className="w-4 h-4" />
          </Button>
        </div>
        {uploadStatus && (
          <div className={`text-xs px-3 py-2 font-mono flex items-center gap-2 ${uploadStatus.includes('Error') || uploadStatus.includes('failed') || uploadStatus.includes('Failed') ? 'text-destructive bg-destructive/10' : uploadStatus.includes('complete') || uploadStatus.includes('Complete') || uploadStatus.includes('trained') ? 'bg-accent/10' : 'text-muted-foreground bg-muted'}`} style={{ borderRadius: 0, color: uploadStatus.includes('complete') || uploadStatus.includes('trained') ? 'hsl(80, 80%, 50%)' : undefined }}>
            {uploading && (
              <svg className="w-3 h-3 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
              </svg>
            )}
            {uploadStatus}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed cursor-pointer transition-colors duration-200 p-8 flex flex-col items-center justify-center gap-3 min-h-[180px] ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
      style={{ borderRadius: 0 }}
    >
      <div className="w-12 h-12 bg-secondary flex items-center justify-center" style={{ borderRadius: 0 }}>
        <FiUpload className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm text-foreground font-medium font-mono">Drop your LinkedIn PDF here</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">or click to browse -- PDF, DOCX, TXT supported</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}

// --- Metadata Panel ---
function MetadataPanel({ result }: { result: AgentResult }) {
  const sectionsMapped = Array.isArray(result?.sections_mapped) ? result.sections_mapped : []
  const missingSections = Array.isArray(result?.missing_sections) ? result.missing_sections : []
  const keywordsInjected = Array.isArray(result?.keywords_injected) ? result.keywords_injected : []

  return (
    <div className="space-y-5">
      {sectionsMapped.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-mono">Sections Mapped</h4>
          <div className="flex flex-wrap gap-1.5">
            {sectionsMapped.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-mono" style={{ borderRadius: 0, color: 'hsl(80, 80%, 50%)' }}>
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {missingSections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-mono">Missing Sections</h4>
          <div className="flex flex-wrap gap-1.5">
            {missingSections.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs font-mono border-destructive" style={{ borderRadius: 0, color: 'hsl(338, 95%, 55%)' }}>
                <FiAlertTriangle className="w-3 h-3 mr-1" />
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {keywordsInjected.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-mono">Keywords Injected</h4>
          <div className="flex flex-wrap gap-1.5">
            {keywordsInjected.map((k, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-mono" style={{ borderRadius: 0, color: 'hsl(190, 81%, 67%)' }}>
                {k}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Agent Status ---
function AgentStatusCard({ activeAgentId }: { activeAgentId: string | null }) {
  const isActive = activeAgentId === AGENT_ID
  return (
    <Card className="border-border" style={{ borderRadius: 0 }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 flex-shrink-0 ${isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} style={{ borderRadius: '50%' }} />
            <div>
              <p className="text-xs font-medium text-foreground font-mono">LaTeX Resume Architect Agent</p>
              <p className="text-xs text-muted-foreground font-mono">{AGENT_ID}</p>
            </div>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs font-mono" style={{ borderRadius: 0 }}>
            {isActive ? 'Processing' : 'Ready'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---
export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null)
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileUploaded, setFileUploaded] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [metaExpanded, setMetaExpanded] = useState(true)

  // Word count for displayed JD
  const currentJD = showSample && !jobDescription ? SAMPLE_JD : jobDescription
  const wordCount = currentJD.trim() ? currentJD.trim().split(/\s+/).length : 0

  // Derived display data
  const displayResult = showSample ? SAMPLE_RESULT : agentResult
  const latexCode = displayResult?.latex_code ?? ''

  // Handle file selection + upload to RAG
  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setUploadStatus('Uploading to knowledge base...')
    setUploading(true)
    setFileUploaded(false)
    setError(null)

    try {
      const result = await uploadAndTrainDocument(RAG_ID, f)
      if (result.success) {
        setUploadStatus('Upload complete -- file trained to knowledge base')
        setFileUploaded(true)
      } else {
        setUploadStatus(`Upload failed: ${result.error ?? 'Unknown error'}`)
        setFileUploaded(false)
      }
    } catch (err) {
      setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
      setFileUploaded(false)
    } finally {
      setUploading(false)
    }
  }, [])

  const handleRemoveFile = useCallback(() => {
    setFile(null)
    setUploadStatus('')
    setFileUploaded(false)
  }, [])

  // Generate resume
  const handleGenerate = useCallback(async () => {
    const jd = showSample && !jobDescription ? SAMPLE_JD : jobDescription
    if (!jd.trim()) return

    setLoading(true)
    setError(null)
    setActiveAgentId(AGENT_ID)
    setAgentResult(null)
    setArtifactFiles([])

    try {
      const message = `Here is the Job Description I want to tailor my resume to:\n\n${jd}\n\nPlease retrieve my LinkedIn profile data from the knowledge base and generate a complete, compile-ready LaTeX resume optimized for this JD.`
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const data = result?.response?.result
        setAgentResult({
          latex_code: data?.latex_code ?? '',
          template_type: data?.template_type ?? 'Unknown',
          sections_mapped: Array.isArray(data?.sections_mapped) ? data.sections_mapped : [],
          missing_sections: Array.isArray(data?.missing_sections) ? data.missing_sections : [],
          keywords_injected: Array.isArray(data?.keywords_injected) ? data.keywords_injected : [],
        })
        const files = Array.isArray(result?.module_outputs?.artifact_files) ? result.module_outputs.artifact_files : []
        setArtifactFiles(files)
      } else {
        setError(result?.error ?? 'Agent call failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [jobDescription, showSample])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!latexCode) return
    try {
      await navigator.clipboard.writeText(latexCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = latexCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [latexCode])

  // Download .tex file
  const handleDownload = useCallback(() => {
    if (!latexCode) return
    const blob = new Blob([latexCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.tex'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [latexCode])

  const canGenerate = (fileUploaded || showSample) && currentJD.trim().length > 0 && !loading

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary flex items-center justify-center flex-shrink-0" style={{ borderRadius: 0 }}>
                <FiTerminal className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-base font-bold tracking-tight font-mono text-foreground">LaTeX Resume Architect</h1>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground font-mono cursor-pointer select-none">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={showSample}
                onCheckedChange={setShowSample}
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Input Section - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: File Upload */}
            <Card className="border-border" style={{ borderRadius: 0 }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono font-semibold flex items-center gap-2">
                  <FiUpload className="w-4 h-4 text-primary" />
                  LinkedIn Profile Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showSample && !file ? (
                  <div className="border border-border bg-secondary p-4 space-y-2" style={{ borderRadius: 0 }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted flex items-center justify-center flex-shrink-0" style={{ borderRadius: 0 }}>
                        <FiFile className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground font-mono">sample_linkedin_profile.pdf</p>
                        <p className="text-xs text-muted-foreground font-mono">142 KB</p>
                      </div>
                    </div>
                    <div className="text-xs px-3 py-2 bg-accent/10 font-mono" style={{ borderRadius: 0, color: 'hsl(80, 80%, 50%)' }}>
                      Sample data active -- using pre-loaded profile
                    </div>
                  </div>
                ) : (
                  <FileDropZone
                    file={file}
                    onFile={handleFile}
                    onRemove={handleRemoveFile}
                    uploadStatus={uploadStatus}
                    uploading={uploading}
                  />
                )}
              </CardContent>
            </Card>

            {/* Right: Job Description */}
            <Card className="border-border" style={{ borderRadius: 0 }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono font-semibold flex items-center gap-2">
                  <FiCode className="w-4 h-4 text-primary" />
                  Target Job Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Paste the target Job Description here..."
                  className="min-h-[160px] font-mono text-sm bg-secondary border-border resize-none focus:ring-1 focus:ring-ring"
                  style={{ borderRadius: 0 }}
                  value={currentJD}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground font-mono">{wordCount} words</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-12 text-sm font-mono font-bold tracking-wide"
            style={{ borderRadius: 0 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                </svg>
                Mapping your profile to LaTeX...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FiZap className="w-4 h-4" />
                Generate LaTeX Resume
              </span>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="border border-destructive bg-destructive/10 p-4 flex items-start gap-3" style={{ borderRadius: 0 }}>
              <FiAlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive font-mono">Generation Failed</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Output Section */}
          {displayResult ? (
            <div className="space-y-4">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono text-xs" style={{ borderRadius: 0 }}>
                    {displayResult?.template_type ?? 'Template'}
                  </Badge>
                  {latexCode && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {latexCode.split('\n').length} lines
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.isArray(artifactFiles) && artifactFiles.length > 0 && artifactFiles.map((af, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs border-border"
                      style={{ borderRadius: 0 }}
                      onClick={() => {
                        if (af?.file_url) window.open(af.file_url, '_blank')
                      }}
                    >
                      <FiDownload className="w-3.5 h-3.5 mr-1.5" />
                      {af?.name ?? `File ${idx + 1}`}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!latexCode}
                    className="font-mono text-xs border-border"
                    style={{ borderRadius: 0 }}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1.5" style={{ color: 'hsl(80, 80%, 50%)' }}>
                        <FiCheck className="w-3.5 h-3.5" />
                        Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <FiCopy className="w-3.5 h-3.5" />
                        Copy Code
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!latexCode}
                    className="font-mono text-xs border-border"
                    style={{ borderRadius: 0 }}
                  >
                    <FiDownload className="w-3.5 h-3.5 mr-1.5" />
                    Download .tex
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Code Block */}
                <Card className="lg:col-span-3 border-border overflow-hidden" style={{ borderRadius: 0 }}>
                  <ScrollArea className="h-[520px]">
                    <pre className="p-4 text-xs font-mono overflow-x-auto" style={{ tabSize: 2 }}>
                      <code>
                        {latexCode ? highlightLatex(latexCode) : (
                          <span className="text-muted-foreground">Your LaTeX resume will appear here.</span>
                        )}
                      </code>
                    </pre>
                  </ScrollArea>
                </Card>

                {/* Metadata Sidebar */}
                <Card className="border-border" style={{ borderRadius: 0 }}>
                  <CardHeader className="pb-2">
                    <button
                      onClick={() => setMetaExpanded(!metaExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider">Results</CardTitle>
                      {metaExpanded ? (
                        <FiChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FiChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </CardHeader>
                  {metaExpanded && (
                    <CardContent>
                      <MetadataPanel result={displayResult} />
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          ) : loading ? (
            /* Loading State */
            <Card className="border-border" style={{ borderRadius: 0 }}>
              <CardContent className="py-16 space-y-6">
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93" />
                  </svg>
                  <p className="text-sm text-foreground font-mono">Generating LaTeX resume...</p>
                </div>
                <div className="max-w-md mx-auto space-y-3">
                  <div className="h-4 bg-muted animate-pulse w-full" style={{ borderRadius: 0 }} />
                  <div className="h-4 bg-muted animate-pulse w-4/5" style={{ borderRadius: 0 }} />
                  <div className="h-4 bg-muted animate-pulse w-3/5" style={{ borderRadius: 0 }} />
                  <div className="h-4 bg-muted animate-pulse w-5/6" style={{ borderRadius: 0 }} />
                  <div className="h-4 bg-muted animate-pulse w-2/3" style={{ borderRadius: 0 }} />
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Empty State */
            <Card className="border-border" style={{ borderRadius: 0 }}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-secondary flex items-center justify-center mb-4" style={{ borderRadius: 0 }}>
                  <FiCode className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-mono font-medium mb-1">Your LaTeX resume will appear here</p>
                <p className="text-xs text-muted-foreground max-w-sm font-mono">
                  Upload your LinkedIn profile PDF, paste a target job description, and click Generate to create a compile-ready LaTeX resume.
                </p>
              </CardContent>
            </Card>
          )}

          <Separator className="bg-border" />

          {/* Agent Status */}
          <AgentStatusCard activeAgentId={activeAgentId} />
        </main>
      </div>
    </ErrorBoundary>
  )
}
