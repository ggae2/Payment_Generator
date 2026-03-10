import { useState, useRef, useEffect } from 'react'
import { agentChat } from '../../services/api'

const EXAMPLES = [
  { label: 'BATCH', text: 'Generate 5 varied incoming CHF pacs.008 for IBAN CH5604835012345678009' },
  { label: 'DUPL', text: 'Generate 3 payments including a duplicate to test detection' },
  { label: 'REJECT', text: 'Generate a pacs.008 with invalid BIC to test rejection' },
  { label: 'HIGH-VAL', text: 'Generate 2 high-value CHF payments > 1M for threshold testing' },
]

/* Tag badge */
const Tag = ({ children, color = 'var(--accent)' }) => (
  <span className="mono" style={{
    fontSize: 9, fontWeight: 600,
    color, border: `1px solid ${color}`,
    padding: '2px 6px', borderRadius: 3,
  }}>{children}</span>
)

export default function AgentChat({ onFilesGenerated, onSelectFile }) {
  const [messages, setMessages]   = useState([])
  const [history, setHistory]     = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [clientCtx, setCtx]       = useState({ creditor_name:'', creditor_iban:'', creditor_bic:'' })
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', text: msg }])
    setLoading(true)
    try {
      const { data } = await agentChat(msg, clientCtx, history)
      setMessages(prev => [...prev, { role:'assistant', text: data.message, files: data.generated_files }])
      setHistory(data.history)
      if (data.generated_files?.length) {
        onFilesGenerated(data.generated_files)
        onSelectFile(data.generated_files[0])
      }
    } catch(e) {
      const detail = e.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join('\n')
          : e.message
      setMessages(prev => [...prev, { role:'assistant', text: msg, error: true }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-0)' }}>
      {/* Context bar */}
      <div style={{
        background:'var(--bg-1)', borderBottom:'1px solid var(--border)',
        padding:'12px 20px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ color:'var(--text-1)', fontSize:12, fontWeight:600 }}>Client Context</span>
          <span style={{ color:'var(--text-3)', fontSize:11 }}>
            Optional creditor pre-fill
          </span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
          {[['creditor_name','Name'],['creditor_iban','IBAN'],['creditor_bic','BIC']].map(([k,label]) => (
            <input key={k} placeholder={label}
              value={clientCtx[k]}
              onChange={e => setCtx(p => ({...p,[k]:e.target.value}))}
              style={{
                background:'var(--bg-2)',
                border:'1px solid var(--border)',
                borderRadius:4, padding:'6px 10px',
                color:'var(--text-1)',
                fontFamily:'IBM Plex Mono, monospace', fontSize:11, fontWeight:400,
                outline:'none', transition:'all 0.15s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {messages.length === 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ marginBottom:10 }}>
              <span style={{ color:'var(--text-2)', fontSize:12, fontWeight:600 }}>Quick scenarios</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => send(ex.text)} style={{
                  display:'flex', alignItems:'center', gap:10,
                  background:'var(--bg-1)',
                  border:'1px solid var(--border)',
                  borderRadius:6, padding:'10px 14px',
                  cursor:'pointer', textAlign:'left',
                  transition:'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor='var(--accent)'
                  e.currentTarget.style.background='var(--accent-soft)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor='var(--border)'
                  e.currentTarget.style.background='var(--bg-1)'
                }}
                >
                  <Tag>{ex.label}</Tag>
                  <span style={{ color:'var(--text-2)', fontSize:12 }}>{ex.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="fade-in" style={{ marginBottom:14,
            display:'flex', flexDirection:'column',
            alignItems: m.role==='user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Tag color={m.role==='user' ? 'var(--accent)' : m.error ? 'var(--error)' : 'var(--success)'}>
                {m.role==='user' ? 'YOU' : m.error ? 'ERR' : 'AI'}
              </Tag>
            </div>
            <div style={{
              maxWidth:'85%',
              background: m.role==='user'
                ? 'var(--primary-soft)'
                : m.error
                ? 'var(--error-soft)'
                : 'var(--bg-1)',
              border: `1px solid ${
                m.role==='user' ? 'rgba(59,130,246,0.2)'
                : m.error ? 'rgba(239,68,68,0.2)'
                : 'var(--border)'
              }`,
              borderRadius: '8px',
              padding:'10px 14px',
            }}>
              <p style={{
                margin:0, color:'var(--text-1)', fontSize:13,
                lineHeight:1.6, whiteSpace:'pre-wrap',
              }}>{m.text}</p>
              {m.files?.length > 0 && (
                <div style={{ marginTop:8, display:'flex', gap:4, flexWrap:'wrap' }}>
                  {m.files.map((f,j) => (
                    <button key={j} onClick={() => onSelectFile(f)} style={{
                      padding:'3px 10px', borderRadius:4,
                      background:'var(--success-soft)',
                      border:'1px solid rgba(34,197,94,0.2)',
                      color:'var(--success)', cursor:'pointer',
                      fontFamily:'IBM Plex Mono,monospace', fontSize:10,
                      fontWeight:500,
                      transition:'all 0.15s ease',
                    }}>
                      ↓ {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="fade-in" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
            <Tag color="var(--success)">AI</Tag>
            <div style={{ display:'flex', gap:4, alignItems:'center', marginLeft:2 }}>
              <span className="thinking-dot"/>
              <span className="thinking-dot"/>
              <span className="thinking-dot"/>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop:'1px solid var(--border)', padding:'12px 20px',
        display:'flex', gap:8, background:'var(--bg-1)',
      }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder="Describe your test scenario..."
          style={{
            flex:1, background:'var(--bg-2)',
            border:'1px solid var(--border)', borderRadius:6,
            padding:'9px 12px',
            color:'var(--text-1)',
            fontFamily:"'Inter', sans-serif",
            fontSize:13, fontWeight:400,
            outline:'none', transition:'all 0.15s ease',
          }}
        />
        <button onClick={() => send()} disabled={loading} style={{
          padding:'9px 20px', borderRadius:6,
          background: loading ? 'transparent' : 'var(--accent)',
          border: loading ? '1px solid var(--border)' : '1px solid var(--accent)',
          color: loading ? 'var(--text-3)' : '#FFFFFF',
          cursor: loading ? 'default' : 'pointer',
          fontFamily:"'Inter', sans-serif",
          fontSize:13, fontWeight:600,
          transition:'all 0.15s ease',
        }}>
          Send
        </button>
      </div>
    </div>
  )
}
