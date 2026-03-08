export default function XmlPreview({ file }) {
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
        <button onClick={download} style={{
          marginLeft:'auto', padding:'4px 12px',
          border:'1px solid var(--accent)', borderRadius:4,
          background:'var(--accent-soft)', color:'var(--accent)',
          cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10,
          fontWeight:500,
          transition:'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--accent)'; e.currentTarget.style.color='#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background='var(--accent-soft)'; e.currentTarget.style.color='var(--accent)'; }}
        >
          ↓ Download
        </button>
      </div>

      {/* Line numbers + XML */}
      <div style={{ flex:1, overflow:'auto', display:'flex' }}>
        <div style={{
          background:'var(--bg-1)', borderRight:'1px solid var(--border)',
          padding:'12px 10px', textAlign:'right', userSelect:'none', flexShrink:0,
          minWidth:40,
        }}>
          {file.content.split('\n').map((_,i) => (
            <div key={i} className="mono" style={{
              color:'var(--text-3)', fontSize:11, lineHeight:'1.7',
              minWidth:24,
            }}>
              {i+1}
            </div>
          ))}
        </div>
        <pre style={{
          flex:1, margin:0, padding:'12px 16px',
          fontFamily:'IBM Plex Mono,monospace', fontSize:11,
          lineHeight:1.7, color:'var(--text-2)',
          background:'var(--bg-0)', overflow:'auto',
          fontWeight:400,
        }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  )
}
