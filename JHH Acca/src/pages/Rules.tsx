import { useEffect, useState } from 'react'
import RequireAuth from '../components/RequireAuth'
import { PageTitle } from '../components/ui'

/* Renders the official rules markdown with a light-touch parser (headings,
   tables, lists, bold) - no dependency needed for one document. */

function renderInline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  )
}

function RulesInner() {
  const [md, setMd] = useState('')
  useEffect(() => {
    fetch('/rules/acca-rules-2026-27.md')
      .then((r) => r.text())
      .then(setMd)
  }, [])

  const blocks: React.ReactNode[] = []
  const lines = md.split('\n')
  let list: string[] = []
  let table: string[][] = []

  const flushList = (key: number) => {
    if (!list.length) return
    blocks.push(
      <ul key={`ul${key}`} className="mb-3 ml-4 list-disc space-y-1 text-[13px] leading-relaxed">
        {list.map((li, i) => (
          <li key={i} className="text-muted">
            <span className="text-text">{renderInline(li)}</span>
          </li>
        ))}
      </ul>,
    )
    list = []
  }
  const flushTable = (key: number) => {
    if (!table.length) return
    blocks.push(
      <table key={`t${key}`} className="mb-3 w-full font-mono text-[12px]">
        <tbody>
          {table.map((row, i) => (
            <tr key={i} className="border-b" style={{ borderColor: 'var(--color-line)' }}>
              {row.map((c, j) => (
                <td key={j} className={`py-1.5 ${i === 0 ? 'overline' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>,
    )
    table = []
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (!cells.every((c) => /^-+$/.test(c))) table.push(cells)
      return
    }
    flushTable(i)
    if (/^- /.test(line)) {
      list.push(line.slice(2))
      return
    }
    flushList(i)
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={i} className="display mb-2 mt-5 text-[17px]" style={{ color: 'var(--color-accent-bright)' }}>
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={i} className="display mb-1 mt-2 text-xl">{line.slice(2)}</h1>,
      )
    } else if (line === '---' || line === '') {
      // skip
    } else {
      blocks.push(
        <p key={i} className="mb-2 text-[13px] leading-relaxed text-muted">
          <span className="text-text">{renderInline(line.replace(/^\*|\*$/g, ''))}</span>
        </p>,
      )
    }
  })
  flushList(lines.length)
  flushTable(lines.length + 1)

  return (
    <div className="px-4 pb-6">
      <PageTitle>RULES</PageTitle>
      <div className="rounded-[14px] bg-surface px-4 py-3">{blocks}</div>
    </div>
  )
}

export default function Rules() {
  return (
    <RequireAuth>
      <RulesInner />
    </RequireAuth>
  )
}
