import { useState } from 'react'

export default function XmlPreview({ file }) {
  const [copied, setCopied] = useState(false)

  if (!file) return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:12, color:'var(--text-3)',
      background:'var(--bg-0)',
    }}>
      <div style={{
        width:48, height:48, borderRadius:8,
        background:'var(--bg-1)',
        border:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span className="mono" style={{ fontSize:16, opacity:0.3, color:'var(--text-3)' }}>&lt;/&gt;</span>
      </div>
      <div style={{ fontSize:12, color:'var(--text-3)', fontWeight:500 }}>
        No file selected
      </div>
      <div style={{ fontSize:11, color:'var(--text-3)', opacity:0.6 }}>
        Generate a file using the agent or form
      </div>
    </div>
  )

  const download = () => {
    const blob = new Blob([file.content], { type:'application/xml' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
  }

  const copy = () => {
    navigator.clipboard.writeText(file.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Syntax highlighting
  const highlighted = file.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\w]+)="([^"]*)"/g, (_, attr, val) =>
      `<span class="syn-attr">${attr}</span>="<span class="syn-val">${val}</span>"`)
    .replace(/(&lt;\/?)([\.\w.:]+)/g, (_, slash, tag) =>
      `${slash}<span class="syn-tag">${tag}</span>`)

  const lineCount = file.content.split('\n').length

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-0)' }}>
      {/* Toolbar */}
      <div style={{
        background:'var(--bg-1)', borderBottom:'1px solid var(--border)',
        padding:'6px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span className="mono" style={{ color:'var(--text-1)', fontSize:12, fontWeight:500 }}>{file.name}</span>
        <span className="mono" style={{ color:'var(--text-3)', fontSize:10 }}>{lineCount} lines</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={copy} style={{
            padding:'4px 12px',
            border:'1px solid var(--border)', borderRadius:4,
            background: copied ? 'var(--success-soft)' : 'transparent',
            color: copied ? 'var(--success)' : 'var(--text-3)',
            cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10,
            fontWeight:500, transition:'all 0.15s ease',
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor='var(--text-3)'; e.currentTarget.style.color='var(--text-1)'; }}}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-3)'; }}}
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
          <button onClick={download} style={{
            padding:'4px 12px',
            border:'1px solid var(--accent)', borderRadius:4,
            background:'var(--accent-soft)', color:'var(--accent)',
            cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10,
            fontWeight:500, transition:'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--accent)'; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background='var(--accent-soft)'; e.currentTarget.style.color='var(--accent)'; }}
          >
            ↓ Download
          </button>
        </div>
      </div>

      {/* Single-scroll container — line numbers + code scroll as one unit */}
      <div style={{ flex:1, overflow:'auto', background:'var(--bg-0)' }}>
        <div style={{ display:'flex', minWidth:'max-content', minHeight:'100%' }}>
          {/* Line numbers — sticky on left so they stay visible on horizontal scroll */}
          <div style={{
            position:'sticky', left:0, zIndex:1,
            background:'var(--bg-1)', borderRight:'1px solid var(--border)',
            padding:'12px 10px', textAlign:'right', userSelect:'none', flexShrink:0,
            minWidth:44, alignSelf:'flex-start',
          }}>
            {file.content.split('\n').map((_,i) => (
              <div key={i} className="mono" style={{
                color:'var(--text-3)', fontSize:11, lineHeight:'1.7', minWidth:24,
              }}>
                {i+1}
              </div>
            ))}
          </div>
          <pre style={{
            flex:1, margin:0, padding:'12px 16px',
            fontFamily:'IBM Plex Mono,monospace', fontSize:11,
            lineHeight:1.7, color:'var(--text-2)',
            background:'var(--bg-0)', whiteSpace:'pre',
            fontWeight:400,
          }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      </div>
    </div>
  )
}
