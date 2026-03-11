import { useState, useEffect } from 'react'
import AgentChat  from './components/chat/AgentChat'
import FormPanel  from './components/forms/FormPanel'
import XmlPreview from './components/preview/XmlPreview'

function ConsentGate({ onAccept }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-accent)',
        borderRadius: 12,
        padding: '32px 36px',
        maxWidth: 480, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(234,179,8,0.12)',
            border: '1px solid rgba(234,179,8,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>!</div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-1)', fontWeight: 700, fontSize: 15 }}>Data Privacy Notice</p>
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>Please read before proceeding</p>
          </div>
        </div>

        {/* Items */}
        {[
          [
            'Purpose',
            'This tool generates ISO 20022 XML test files for SIC/SEPA interbank certification and integration testing only.',
          ],
          [
            'Prohibited data',
            'Do not enter real customer data, production IBANs, account numbers, or any personally identifiable information (PII).',
          ],
          [
            'AI data transmission',
            'Your inputs are sent to Anthropic Claude for processing. Ensure this complies with your organisation\'s data classification and AI usage policy.',
          ],
        ].map(([title, body]) => (
          <div key={title} style={{
            display: 'flex', gap: 12, marginBottom: 16,
            background: 'var(--bg-2)', borderRadius: 8,
            padding: '12px 14px',
            border: '1px solid var(--border)',
          }}>
            <div>
              <p style={{ margin: '0 0 3px', color: 'var(--text-1)', fontSize: 12, fontWeight: 600 }}>{title}</p>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 }}>{body}</p>
            </div>
          </div>
        ))}

        {/* CTA */}
        <button onClick={onAccept} style={{
          width: '100%', marginTop: 8,
          padding: '12px 0', borderRadius: 8,
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.01em',
          fontFamily: "'Inter',sans-serif",
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          I understand — start session
        </button>
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 10, marginTop: 12, marginBottom: 0 }}>
          This notice appears once per session and is not stored.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [mode, setMode]             = useState('agent')
  const [generatedFiles, setFiles]  = useState([])
  const [selectedFile, setSelected] = useState(null)
  const [theme, setTheme]           = useState(() => localStorage.getItem('theme') || 'dark')
  const [consented, setConsented]   = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const addFiles = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles])
    if (newFiles.length > 0) setSelected(newFiles[0])
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-0)' }}>
      {!consented && <ConsentGate onAccept={() => setConsented(true)} />}
      {/* Header */}
      <header style={{
        background: 'var(--bg-1)',
        padding: '0 24px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          {/* Swiss cross mark */}
          <div style={{
            width:24, height:24, borderRadius:4,
            background:'#DC2626',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ color:'#fff', fontSize:14, fontWeight:700, lineHeight:1 }}>+</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8 }}>
            <span style={{
              color:'var(--text-1)', fontWeight:600, fontSize:14,
              letterSpacing:'-0.01em',
            }}>
              SIC · SEPA
            </span>
            <span className="mono" style={{
              color:'var(--text-3)', fontSize:10,
              letterSpacing:'0.02em',
            }}>
              ISO 20022
            </span>
          </div>
        </div>

        {/* Center — Mode tabs */}
        <div style={{
          display:'flex', gap: 0,
          background: 'var(--bg-2)',
          borderRadius: 6,
          padding: 2,
          border: '1px solid var(--border)',
        }}>
          {[
            { key:'agent', label:'Agent' },
            { key:'form',  label:'Form' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              padding: '5px 16px',
              borderRadius: 4,
              border: 'none',
              background: mode === m.key ? 'var(--accent-soft)' : 'transparent',
              color: mode === m.key ? 'var(--accent)' : 'var(--text-3)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: mode === m.key ? 500 : 400,
              transition: 'all 0.15s ease',
            }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Right — theme + status */}
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background:'var(--success)',
              boxShadow:'0 0 6px rgba(34,197,94,0.4)',
            }}/>
            <span className="mono" style={{ color:'var(--text-3)', fontSize:10 }}>
              CONNECTED
            </span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {/* Main */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Left panel */}
        <div style={{
          width:'50%',
          overflow:'hidden', display:'flex', flexDirection:'column',
          borderRight: '1px solid var(--border)',
        }}>
          {mode === 'agent'
            ? <AgentChat onFilesGenerated={addFiles} onSelectFile={setSelected} />
            : <FormPanel  onFilesGenerated={addFiles} onSelectFile={setSelected} />
          }
        </div>

        {/* Right panel */}
        <div style={{ width:'50%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {generatedFiles.length > 0 && (
            <div style={{
              background: 'var(--bg-1)',
              borderBottom: '1px solid var(--border)',
              padding: '6px 16px',
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              flexShrink: 0,
              alignItems: 'center',
            }}>
              <span className="mono" style={{ color:'var(--text-3)', fontSize:10, marginRight:4 }}>
                {generatedFiles.length} file{generatedFiles.length > 1 ? 's' : ''}
              </span>
              {generatedFiles.map((f, i) => (
                <button key={i} onClick={() => setSelected(f)} title={f.name} style={{
                  padding: '3px 10px',
                  border: selectedFile === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 4,
                  background: selectedFile === f ? 'var(--accent-soft)' : 'transparent',
                  color: selectedFile === f ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  transition: 'all 0.15s ease',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
          <XmlPreview file={selectedFile} />
        </div>
      </div>
    </div>
  )
}
