import { useState, useRef, useEffect }        from 'react'
import { agentChat }                           from '../../services/api'
import { flattenApiError, downloadFile }       from '../../hooks/useFilePanel'

const EXAMPLES = [
  { label: 'BATCH',    text: 'Generate 5 varied incoming CHF pacs.008 for stress testing', scheme: 'sic' },
  { label: 'DUPL',     text: 'Generate 3 payments including a duplicate to test detection', scheme: 'sic' },
  { label: 'REJECT',   text: 'Generate a pacs.008 with invalid IBAN to test rejection handling', scheme: 'sic' },
  { label: 'HIGH-VAL', text: 'Generate high-value CHF payments above 1M for threshold testing', scheme: 'sic' },
  { label: 'SEPA-SCT', text: 'Generate a SEPA SCT incoming pacs.008 for integration testing', scheme: 'sepa' },
  { label: 'SEPA-EUR', text: 'Generate 3 SEPA EUR transfers from different European banks', scheme: 'sepa' },
]

const LOADING_STEPS = [
  'Analyzing scenario…',
  'Reasoning about test strategy…',
  'Calling generator…',
  'Building XML…',
]

/* ── Consent overlay (shown on first send attempt) ── */
function ConsentCard({ onAccept }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{
        maxWidth: 440, width: '100%',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-accent)',
        borderRadius: 10,
        padding: '28px 32px',
      }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', color: 'var(--text-1)', fontWeight: 700, fontSize: 14 }}>
            Data Privacy Notice
          </p>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 11 }}>
            Please read before using the Agent
          </p>
        </div>

        {[
          ['Purpose',          'Generates ISO 20022 XML test files for SIC/SEPA interbank testing only.'],
          ['Prohibited data',  'Do not enter real customer data, production IBANs, or any PII.'],
          ['AI transmission',  'Inputs are processed by Anthropic Claude. Ensure compliance with your organisation\'s data policy.'],
        ].map(([title, body]) => (
          <div key={title} style={{
            display: 'flex', gap: 12, marginBottom: 10,
            padding: '10px 14px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            <div style={{ width: 2, flexShrink: 0, background: 'var(--border-accent)', borderRadius: 2 }} />
            <div>
              <p style={{ margin: '0 0 2px', color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
                fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '0.04em' }}>{title.toUpperCase()}</p>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 }}>{body}</p>
            </div>
          </div>
        ))}

        <button onClick={onAccept} style={{
          width: '100%', marginTop: 16,
          padding: '10px 0', borderRadius: 6,
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Inter',sans-serif",
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          I understand — start session
        </button>
      </div>
    </div>
  )
}

/* ── Tag badge ── */
const Tag = ({ children, color = 'var(--accent)' }) => (
  <span className="mono" style={{
    fontSize: 9, fontWeight: 600, flexShrink: 0,
    color, border: `1px solid ${color}`,
    padding: '2px 6px', borderRadius: 3,
  }}>{children}</span>
)

/* ── Inline markdown: **bold**, `code` ── */
function inlineFormat(text) {
  const parts = []
  let rem = text, k = 0
  while (rem.length > 0) {
    const bold = rem.match(/^(.*?)\*\*(.+?)\*\*(.*)$/)
    if (bold) {
      if (bold[1]) parts.push(<span key={k++}>{bold[1]}</span>)
      parts.push(<strong key={k++} style={{ fontWeight: 700 }}>{bold[2]}</strong>)
      rem = bold[3]; continue
    }
    const code = rem.match(/^(.*?)`(.+?)`(.*)$/)
    if (code) {
      if (code[1]) parts.push(<span key={k++}>{code[1]}</span>)
      parts.push(<code key={k++} style={{
        fontFamily: 'IBM Plex Mono,monospace', fontSize: 11,
        background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3,
        color: 'var(--accent)',
      }}>{code[2]}</code>)
      rem = code[3]; continue
    }
    parts.push(<span key={k++}>{rem}</span>); break
  }
  return parts
}

/* ── Block markdown renderer ── */
function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const els = []
  let k = 0
  for (const line of lines) {
    if (line.trim() === '---') {
      els.push(<hr key={k++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />)
    } else if (line.startsWith('## ')) {
      els.push(<p key={k++} style={{ margin: '10px 0 3px', fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{inlineFormat(line.slice(3))}</p>)
    } else if (line.startsWith('### ')) {
      els.push(<p key={k++} style={{ margin: '8px 0 2px', fontWeight: 600, fontSize: 12, color: 'var(--text-2)' }}>{inlineFormat(line.slice(4))}</p>)
    } else if (line.match(/^[-*] /)) {
      els.push(
        <div key={k++} style={{ display: 'flex', gap: 7, margin: '2px 0' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span>
          <span style={{ color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6 }}>{inlineFormat(line.slice(2))}</span>
        </div>
      )
    } else if (line.match(/^\d+\. /)) {
      const [, num, rest] = line.match(/^(\d+)\. (.*)/)
      els.push(
        <div key={k++} style={{ display: 'flex', gap: 7, margin: '2px 0' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, minWidth: 14, fontSize: 13 }}>{num}.</span>
          <span style={{ color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6 }}>{inlineFormat(rest)}</span>
        </div>
      )
    } else if (line.trim() === '') {
      els.push(<div key={k++} style={{ height: 5 }} />)
    } else {
      els.push(<p key={k++} style={{ margin: '2px 0', color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6 }}>{inlineFormat(line)}</p>)
    }
  }
  return <div>{els}</div>
}

/* ── Copy button ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} title="Copy" style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: copied ? 'var(--success)' : 'var(--text-3)',
      fontSize: 11, padding: '2px 5px', borderRadius: 3,
      transition: 'color 0.15s',
    }}>{copied ? '✓' : '⧉'}</button>
  )
}

/* ── Timestamp ── */
const Ts = ({ ts }) => (
  <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>
    {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>
)

export default function AgentChat({ onFilesGenerated, onSelectFile }) {
  const [messages, setMessages]   = useState([])
  const [history, setHistory]     = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [loadStep, setLoadStep]   = useState(0)
  const [ctxOpen, setCtxOpen]     = useState(true)
  const [consented, setConsented] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [clientCtx, setCtx]       = useState({ scheme:'sic', creditor_name:'', creditor_iban:'', creditor_iid:'', creditor_bic:'' })
  const endRef    = useRef(null)
  const stepTimer = useRef(null)
  const pendingRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  /* Cycle loading status text */
  useEffect(() => {
    if (loading) {
      setLoadStep(0)
      stepTimer.current = setInterval(() => {
        setLoadStep(s => (s + 1) % LOADING_STEPS.length)
      }, 1800)
    } else {
      clearInterval(stepTimer.current)
    }
    return () => clearInterval(stepTimer.current)
  }, [loading])

  const clearSession = () => {
    setMessages([]); setHistory([]); setConsented(false); setShowConsent(false)
    pendingRef.current = null
  }

  /* Actual API call — bypasses consent check */
  const executeSend = async (msg) => {
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg, ts: Date.now() }])
    setLoading(true)
    try {
      const { data } = await agentChat(msg, clientCtx, history)
      setMessages(prev => [...prev, {
        role: 'assistant', text: data.message,
        files: data.generated_files, ts: Date.now(),
      }])
      setHistory(data.history)
      if (data.generated_files?.length) {
        onFilesGenerated(data.generated_files)
        onSelectFile(data.generated_files[0])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: flattenApiError(e), error: true, ts: Date.now() }])
    }
    setLoading(false)
  }

  /* Gate: show consent on first attempt, then send */
  const send = (text, overrideScheme) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    if (overrideScheme) setCtx(p => ({ ...p, scheme: overrideScheme }))
    if (!consented) {
      pendingRef.current = msg
      setShowConsent(true)
      return
    }
    executeSend(msg)
  }

  const handleAccept = () => {
    setConsented(true)
    setShowConsent(false)
    if (pendingRef.current) {
      const msg = pendingRef.current
      pendingRef.current = null
      executeSend(msg)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-0)', position: 'relative' }}>

      {/* ── Context bar ── */}
      <div style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 20px', cursor: 'pointer',
        }} onClick={() => setCtxOpen(o => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-3)', fontSize: 10, userSelect: 'none' }}>
              {ctxOpen ? '▾' : '▸'}
            </span>
            <span style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 600 }}>Creditor pre-fill</span>
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>optional — agent will ask if empty</span>
            {/* Scheme toggle */}
            <div style={{ display:'flex', gap:0, background:'var(--bg-2)', borderRadius:4, padding:2, border:'1px solid var(--border)', marginLeft:8 }} onClick={e => e.stopPropagation()}>
              {['sic','sepa'].map(s => (
                <button key={s} onClick={() => setCtx(p => ({ ...p, scheme: s }))} style={{
                  padding:'2px 10px', borderRadius:3, border:'none',
                  background: clientCtx.scheme === s ? 'var(--accent-soft)' : 'transparent',
                  color: clientCtx.scheme === s ? 'var(--accent)' : 'var(--text-3)',
                  cursor:'pointer', fontFamily:'IBM Plex Mono,monospace',
                  fontSize:10, fontWeight: clientCtx.scheme === s ? 600 : 400,
                  transition:'all 0.15s',
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={e => { e.stopPropagation(); clearSession() }} style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 11,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >↺ New session</button>
          )}
        </div>

        {ctxOpen && (
          <div style={{ padding: '0 20px 12px', display: 'grid', gridTemplateColumns: clientCtx.scheme === 'sic' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
            {[
              ['creditor_name','Name'],
              ['creditor_iban','IBAN'],
              ...(clientCtx.scheme === 'sic' ? [['creditor_iid','IID (6 digits)']] : []),
              ['creditor_bic','BIC'],
            ].map(([k, label]) => (
              <input key={k} placeholder={label}
                value={clientCtx[k] || ''}
                onChange={e => setCtx(p => ({ ...p, [k]: e.target.value }))}
                style={{
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '6px 10px', color: 'var(--text-1)',
                  fontFamily: 'IBM Plex Mono,monospace', fontSize: 11,
                  outline: 'none', transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

            {messages.map((m, i) => (
              <div key={i} className="fade-in" style={{
                marginBottom: 14, display: 'flex', flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {/* Label row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Tag color={m.role === 'user' ? 'var(--accent)' : m.error ? 'var(--error)' : 'var(--success)'}>
                    {m.role === 'user' ? 'YOU' : m.error ? 'ERR' : 'AGENT'}
                  </Tag>
                  <Ts ts={m.ts} />
                  {m.text && <CopyBtn text={m.text} />}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--primary-soft)' : m.error ? 'var(--error-soft)' : 'var(--bg-1)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.2)' : m.error ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  {m.role === 'user'
                    ? <p style={{ margin: 0, color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6 }}>{m.text}</p>
                    : <Markdown text={m.text} />
                  }

                  {/* Generated files */}
                  {m.files?.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {m.files.map((f, j) => (
                        <div key={j} style={{ display: 'flex', gap: 3 }}>
                          <button onClick={() => onSelectFile(f)} style={{
                            padding: '3px 10px', borderRadius: '4px 0 0 4px',
                            background: 'var(--success-soft)', border: '1px solid rgba(34,197,94,0.25)',
                            borderRight: 'none',
                            color: 'var(--success)', cursor: 'pointer',
                            fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, fontWeight: 500,
                          }}>⊞ {f.name}</button>
                          <button onClick={() => downloadFile(f)} title="Download" style={{
                            padding: '3px 8px', borderRadius: '0 4px 4px 0',
                            background: 'var(--success-soft)', border: '1px solid rgba(34,197,94,0.25)',
                            color: 'var(--success)', cursor: 'pointer', fontSize: 11,
                          }}>↓</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <Tag color="var(--success)">AGENT</Tag>
                <span style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
                  {LOADING_STEPS[loadStep]}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span className="thinking-dot"/><span className="thinking-dot"/><span className="thinking-dot"/>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* ── Input bar + quick chips ── */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)', padding: '10px 20px 12px' }}>

            {/* Quick scenario chips — always visible */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => send(ex.text, ex.scheme)} disabled={loading} style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: ex.scheme === 'sepa' ? 'var(--success-soft)' : 'transparent',
                  border: `1px solid ${ex.scheme === 'sepa' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                  color: ex.scheme === 'sepa' ? 'var(--success)' : 'var(--text-3)',
                  cursor: loading ? 'default' : 'pointer',
                  fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = ex.scheme === 'sepa' ? 'var(--success)' : 'var(--accent)'; e.currentTarget.style.color = ex.scheme === 'sepa' ? 'var(--success)' : 'var(--accent)' }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ex.scheme === 'sepa' ? 'rgba(34,197,94,0.3)' : 'var(--border)'; e.currentTarget.style.color = ex.scheme === 'sepa' ? 'var(--success)' : 'var(--text-3)' }}
                >{ex.label}</button>
              ))}
            </div>

            {/* Text input row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Describe your test scenario…"
                disabled={loading}
                style={{
                  flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '9px 12px', color: 'var(--text-1)',
                  fontFamily: "'Inter',sans-serif", fontSize: 13,
                  outline: 'none', transition: 'border-color 0.15s',
                  opacity: loading ? 0.5 : 1,
                }}
              />
              <button onClick={() => send()} disabled={loading} style={{
                padding: '9px 20px', borderRadius: 6,
                background: loading ? 'transparent' : 'var(--accent)',
                border: loading ? '1px solid var(--border)' : '1px solid var(--accent)',
                color: loading ? 'var(--text-3)' : '#fff',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
              }}>Send</button>
            </div>
          </div>

      {/* ── Consent overlay — appears on first send, not on page load ── */}
      {showConsent && <ConsentCard onAccept={handleAccept} />}
    </div>
  )
}