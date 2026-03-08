import { useState } from 'react'
import { generateMessage } from '../../services/api'

const PRESETS = {
  UBS:  { debtor_name:'UBS AG',         debtor_iban:'CH9300762011623852957', debtor_bic:'UBSWCHZH80A', debtor_iid:'000762' },
  CS:   { debtor_name:'Credit Suisse',  debtor_iban:'CH5604835012345678009', debtor_bic:'CRESCHZZ80A', debtor_iid:'004835' },
  RAIF: { debtor_name:'Raiffeisen',     debtor_iban:'CH3608387000001234567', debtor_bic:'RAIFCH22XXX', debtor_iid:'080837' },
  POST: { debtor_name:'PostFinance',    debtor_iban:'CH5600000000000000001', debtor_bic:'POFICHBEXXX', debtor_iid:'009000' },
}

const DEFAULT = {
  debtor_name:'UBS AG', debtor_iban:'CH9300762011623852957', debtor_bic:'UBSWCHZH80A', debtor_iid:'000762',
  debtor_street:'', debtor_postcode:'', debtor_city:'', debtor_country:'CH',
  creditor_name:'', creditor_iban:'', creditor_bic:'', creditor_iid:'',
  creditor_street:'', creditor_postcode:'', creditor_city:'', creditor_country:'CH',
  amount:'10000', currency:'CHF', remittance:'Test payment SIC',
}

const COUNTRIES = [
  ['','— select —'],
  ['AT','AT – Austria'],['BE','BE – Belgium'],['CH','CH – Switzerland'],
  ['CY','CY – Cyprus'],['CZ','CZ – Czech Republic'],['DE','DE – Germany'],
  ['DK','DK – Denmark'],['EE','EE – Estonia'],['ES','ES – Spain'],
  ['FI','FI – Finland'],['FR','FR – France'],['GB','GB – United Kingdom'],
  ['GR','GR – Greece'],['HR','HR – Croatia'],['HU','HU – Hungary'],
  ['IE','IE – Ireland'],['IS','IS – Iceland'],['IT','IT – Italy'],
  ['LI','LI – Liechtenstein'],['LT','LT – Lithuania'],['LU','LU – Luxembourg'],
  ['LV','LV – Latvia'],['MT','MT – Malta'],['NL','NL – Netherlands'],
  ['NO','NO – Norway'],['PL','PL – Poland'],['PT','PT – Portugal'],
  ['RO','RO – Romania'],['SE','SE – Sweden'],['SI','SI – Slovenia'],
  ['SK','SK – Slovakia'],['US','US – United States'],
]

const CountrySelect = ({ value, onChange }) => (
  <select value={value} onChange={onChange} style={{
    width:'100%', background:'rgba(255,255,255,0.02)',
    border:'1px solid var(--border)', borderRadius:4,
    padding:'8px 10px', color:'var(--text-1)',
    fontFamily:'IBM Plex Mono,monospace', fontSize:12,
    outline:'none', cursor:'pointer',
  }}>
    {COUNTRIES.map(([code, label]) => (
      <option key={code} value={code}>{label}</option>
    ))}
  </select>
)

/* Section label */
const SectionLabel = ({ label, sub }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
    <span style={{
      color:'var(--text-1)', fontSize:12, fontWeight:600,
    }}>{label}</span>
    {sub && <span style={{ color:'var(--text-3)', fontSize:11 }}>{sub}</span>}
  </div>
)

const Field = ({ label, value, onChange, mono, children }) => (
  <div style={{ marginBottom:10 }}>
    <label style={{
      display:'block', color:'var(--text-3)', fontSize:10,
      marginBottom:4, fontFamily:'IBM Plex Mono,monospace',
      fontWeight:500,
    }}>
      {label}
    </label>
    {children || (
      <input value={value} onChange={onChange}
        style={{
          width:'100%', background:'var(--bg-2)',
          border:'1px solid var(--border)', borderRadius:4,
          padding:'8px 10px', color:'var(--text-1)',
          fontFamily: mono ? 'IBM Plex Mono,monospace' : "'Inter',sans-serif",
          fontSize:12, fontWeight:400,
          outline:'none', transition:'all 0.15s ease',
        }}
      />
    )}
  </div>
)

export default function FormPanel({ onFilesGenerated, onSelectFile }) {
  const [form, setForm]       = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))
  const applyPreset = (key) => setForm(p => ({...p, ...PRESETS[key]}))

  const IBAN_RE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/
  const IID_RE  = /^[0-9]{6}$/

  const validateForm = () => {
    const errs = []
    if (!form.creditor_name.trim())  errs.push('Creditor Name is required')
    const cIban = form.creditor_iban.replace(/\s/g, '').toUpperCase()
    if (!cIban)                      errs.push('Creditor IBAN is required')
    else if (!IBAN_RE.test(cIban))   errs.push('Creditor IBAN format is invalid (expected e.g. CH93...)')
    if (!form.creditor_iid.trim())   errs.push('Creditor IID is required')
    else if (!IID_RE.test(form.creditor_iid)) errs.push('Creditor IID must be exactly 6 digits')
    if (!form.debtor_iid.trim())     errs.push('Debtor IID is required')
    else if (!IID_RE.test(form.debtor_iid))   errs.push('Debtor IID must be exactly 6 digits')
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) errs.push('Amount must be a positive number')
    return errs
  }

  const submit = async () => {
    const errs = validateForm()
    if (errs.length) { setError(errs.join('\n')); return }
    setLoading(true); setError(null); setSuccess(false)
    try {
      const resp = await generateMessage('sic', 'pacs.008', {...form, amount: parseFloat(form.amount)})
      const text = await resp.data.text()
      const ts   = new Date().toISOString().slice(0,10)
      const filename = `pacs008_${form.debtor_iid}_to_${form.creditor_iid}_${ts}.xml`
      const file = { name: filename, content: text }
      onFilesGenerated([file])
      onSelectFile(file)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch(e) {
      const detail = e.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join('\n')
          : e.message
      setError(msg)
    }
    setLoading(false)
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px 24px' }}>
      {/* Message type */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, marginBottom:20,
        paddingBottom:12, borderBottom:'1px solid var(--border)',
      }}>
        <span className="mono" style={{ color:'var(--accent)', fontSize:12, fontWeight:600 }}>
          pacs.008.001.08
        </span>
        <span style={{ color:'var(--text-3)', fontSize:11 }}>
          FI-to-FI Customer Credit Transfer
        </span>
      </div>

      {/* Debtor */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <SectionLabel label="Debtor" sub="Ordering institution" />
          <div style={{ display:'flex', gap:4 }}>
            {Object.keys(PRESETS).map(k => (
              <button key={k} onClick={() => applyPreset(k)} style={{
                padding:'3px 8px', borderRadius:4,
                border:'1px solid var(--border)', background:'transparent',
                color:'var(--text-3)', cursor:'pointer',
                fontFamily:'IBM Plex Mono,monospace', fontSize:10,
                fontWeight:500,
                transition:'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; e.currentTarget.style.background='var(--accent-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-3)'; e.currentTarget.style.background='transparent'; }}
              >{k}</button>
            ))}
          </div>
        </div>
        <div style={{
          background:'var(--bg-1)',
          border:'1px solid var(--border)', borderRadius:6, padding:'16px',
        }}>
          <Field label="NAME"  value={form.debtor_name} onChange={set('debtor_name')} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="STREET" value={form.debtor_street} onChange={set('debtor_street')} />
            <Field label="CITY"   value={form.debtor_city}   onChange={set('debtor_city')} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="POSTCODE" value={form.debtor_postcode} onChange={set('debtor_postcode')} mono />
            <Field label="COUNTRY (ISO 2)">
              <CountrySelect value={form.debtor_country} onChange={set('debtor_country')} />
            </Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <Field label="IBAN" value={form.debtor_iban} onChange={set('debtor_iban')} mono />
            <Field label="BIC"  value={form.debtor_bic}  onChange={set('debtor_bic')}  mono />
            <Field label="IID (SIC)" value={form.debtor_iid} onChange={set('debtor_iid')} mono />
          </div>
        </div>
      </div>

      {/* Creditor */}
      <div style={{ marginBottom:20 }}>
        <SectionLabel label="Creditor" sub="Beneficiary under test" />
        <div style={{
          background:'var(--bg-1)',
          border:'1px solid var(--border)', borderRadius:6, padding:'16px',
        }}>
          <Field label="NAME"  value={form.creditor_name} onChange={set('creditor_name')} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="STREET" value={form.creditor_street} onChange={set('creditor_street')} />
            <Field label="CITY"   value={form.creditor_city}   onChange={set('creditor_city')} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="POSTCODE" value={form.creditor_postcode} onChange={set('creditor_postcode')} mono />
            <Field label="COUNTRY (ISO 2)">
              <CountrySelect value={form.creditor_country} onChange={set('creditor_country')} />
            </Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <Field label="IBAN" value={form.creditor_iban} onChange={set('creditor_iban')} mono />
            <Field label="BIC"  value={form.creditor_bic}  onChange={set('creditor_bic')}  mono />
            <Field label="IID (SIC)" value={form.creditor_iid} onChange={set('creditor_iid')} mono />
          </div>
        </div>
      </div>

      {/* Payment */}
      <div style={{ marginBottom:24 }}>
        <SectionLabel label="Payment" />
        <div style={{
          background:'var(--bg-1)',
          border:'1px solid var(--border)', borderRadius:6, padding:'16px',
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:10 }}>
            <Field label="AMOUNT" value={form.amount} onChange={set('amount')} mono />
            <Field label="CCY">
              <select value={form.currency} onChange={set('currency')} style={{
                width:'100%', background:'rgba(255,255,255,0.02)',
                border:'1px solid var(--border)', borderRadius:6,
                padding:'9px 12px', color:'var(--accent)',
                fontFamily:'IBM Plex Mono,monospace', fontSize:12, outline:'none',
                cursor:'pointer',
              }}>
                <option>CHF</option><option>EUR</option>
              </select>
            </Field>
          </div>
          <Field label="REMITTANCE INFO" value={form.remittance} onChange={set('remittance')} />
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom:14, padding:'10px 14px',
          background:'var(--error-soft)',
          border:'1px solid rgba(239,68,68,0.2)',
          borderRadius:4, whiteSpace:'pre-line',
        }}>
          <span className="mono" style={{ color:'var(--error)', fontSize:11 }}>Error: {error}</span>
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={submit} disabled={loading} style={{
          flex:1, padding:'10px',
          borderRadius: 6,
          background: success
            ? 'var(--success-soft)'
            : loading
            ? 'transparent'
            : 'var(--accent)',
          border: success ? '1px solid var(--success)' : loading ? '1px solid var(--border)' : '1px solid var(--accent)',
          color: success ? 'var(--success)' : loading ? 'var(--text-3)' : '#FFFFFF',
          cursor: loading ? 'default' : 'pointer',
          fontFamily:"'Inter', sans-serif",
          fontSize:13, fontWeight:600,
          transition:'all 0.15s ease',
        }}>
          {success ? '✓ Generated' : loading ? 'Generating...' : 'Generate Message'}
        </button>
      </div>
    </div>
  )
}
