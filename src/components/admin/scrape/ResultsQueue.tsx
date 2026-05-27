'use client'
import { useCallback, useEffect, useState } from 'react'
import { DiffRow } from './DiffRow'
import type { FieldDiff } from '@/lib/scrapers/types'

type SavedBatch = { timestamp: number; resultIds: number[] }

const STORAGE_KEY = 'scrape-export-batches'

function loadBatches(): SavedBatch[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function persistBatch(ids: number[]): SavedBatch[] {
  const updated = [{ timestamp: Date.now(), resultIds: ids }, ...loadBatches()].slice(0, 3)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

type ScrapeResultRow = {
  id: number
  entityType: string
  entityId: number
  entityName: string
  status: string
  source: string
  diffs: Record<string, FieldDiff>
  diffCount: number
  approvedFields: string[]
}

type Tab = 'pending' | 'approved' | 'rejected' | 'not_found'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'approved',  label: 'Approved'  },
  { key: 'rejected',  label: 'Rejected'  },
  { key: 'not_found', label: 'Not Found' },
]

type FieldChoices = Record<string, { choice: 'keep' | 'accept' | 'edit'; editedValue: string }>

export function ResultsQueue() {
  const [tab, setTab]                       = useState<Tab>('pending')
  const [results, setResults]               = useState<ScrapeResultRow[]>([])
  const [total, setTotal]                   = useState(0)
  const [loading, setLoading]               = useState(false)
  const [expandedId, setExpandedId]         = useState<number | null>(null)
  const [fieldChoices, setFieldChoices]     = useState<Record<number, FieldChoices>>({})
  const [actionLoading, setActionLoading]   = useState<number | null>(null)
  const [exportIds, setExportIds]           = useState<number[]>([])
  const [savedBatches, setSavedBatches]     = useState<SavedBatch[]>([])

  const fetchResults = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/scrape/results?status=${tab}`)
    const data = await res.json()
    if (data.ok) {
      setResults(data.results)
      setTotal(data.total)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchResults() }, [fetchResults])
  useEffect(() => { setSavedBatches(loadBatches()) }, [])

  function handleFieldChange(resultId: number, fieldName: string, choice: 'keep' | 'accept' | 'edit', editedValue: string) {
    setFieldChoices(prev => ({
      ...prev,
      [resultId]: { ...prev[resultId], [fieldName]: { choice, editedValue } },
    }))
  }

  async function handleApprove(result: ScrapeResultRow) {
    setActionLoading(result.id)
    const choices = fieldChoices[result.id] ?? {}
    const approvedFields = Object.keys(result.diffs).filter(f => (choices[f]?.choice ?? 'accept') !== 'keep')
    const edits: Record<string, string> = {}
    for (const f of approvedFields) {
      if (choices[f]?.choice === 'edit') edits[f] = choices[f].editedValue
    }
    await fetch(`/api/admin/scrape/results/${result.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedFields, edits }),
    })
    setExportIds(prev => [...prev, result.id])
    setActionLoading(null)
    fetchResults()
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    await fetch(`/api/admin/scrape/results/${id}/reject`, { method: 'PATCH' })
    setActionLoading(null)
    fetchResults()
  }

  async function handleRevert(id: number) {
    setActionLoading(id)
    await fetch(`/api/admin/scrape/results/${id}/revert`, { method: 'PATCH' })
    setActionLoading(null)
    fetchResults()
  }

  function getInitialChoice(result: ScrapeResultRow, fieldName: string): 'keep' | 'accept' | 'edit' {
    if (result.status !== 'approved') return 'accept'
    if (!result.approvedFields.includes(fieldName)) return 'keep'
    return result.diffs[fieldName]?.edited != null ? 'edit' : 'accept'
  }

  async function downloadExport(resultIds: number[], filename: string) {
    const res = await fetch('/api/admin/scrape/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultIds }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExport() {
    await downloadExport(exportIds, `scrape-export-${Date.now()}.xlsx`)
    setSavedBatches(persistBatch(exportIds))
    setExportIds([])
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-cream-border dark:border-warm-700">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-steve text-steve font-medium'
                : 'border-transparent text-warm-600 dark:text-warm-500 hover:text-steve'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {exportIds.length > 0 && (
        <div className="flex items-center justify-between bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg px-4 py-3">
          <p className="text-sm text-warm-600 dark:text-warm-500">
            <span className="text-steve font-medium">{exportIds.length}</span> approved this session
          </p>
          <button
            onClick={handleExport}
            className="text-sm bg-steve hover:bg-steve-hover text-cream px-4 py-1.5 rounded-lg transition-colors"
          >
            Export XLSX
          </button>
        </div>
      )}

      {savedBatches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-warm-500 uppercase tracking-wide">Recent exports</p>
          {savedBatches.map(batch => (
            <div key={batch.timestamp} className="flex items-center justify-between bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg px-4 py-2.5">
              <p className="text-sm text-warm-600 dark:text-warm-500">
                {new Date(batch.timestamp).toLocaleString()} · <span className="text-steve font-medium">{batch.resultIds.length}</span> rows
              </p>
              <button
                onClick={() => downloadExport(batch.resultIds, `scrape-export-${batch.timestamp}.xlsx`)}
                className="text-xs border border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 px-3 py-1 rounded hover:border-steve transition-colors"
              >
                Re-download
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-warm-500 py-8 text-center">Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-warm-500 py-8 text-center">No {tab} results</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-warm-500">{total} result{total !== 1 ? 's' : ''}</p>
          {results.map(result => (
            <div key={result.id} className="border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden">
              <div
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 bg-cream-card dark:bg-warm-50/5 cursor-pointer hover:bg-cream dark:hover:bg-warm-50/10 transition-colors"
                onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
              >
                <div>
                  <p className="text-sm font-medium text-warm-900 dark:text-warm-200">{result.entityName ?? `${result.entityType} #${result.entityId}`}</p>
                  <p className="text-xs text-warm-500 mt-0.5 capitalize">{result.entityType} · {result.source} · {result.diffCount} field{result.diffCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {result.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(result)}
                        disabled={actionLoading === result.id}
                        className="text-xs bg-steve hover:bg-steve-hover text-cream px-3 py-1 rounded transition-colors disabled:opacity-40"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleReject(result.id)}
                        disabled={actionLoading === result.id}
                        className="text-xs border border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 px-3 py-1 rounded hover:border-steve transition-colors disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </>
                  ) : (result.status === 'approved' || result.status === 'rejected') && (
                    <button
                      onClick={() => handleRevert(result.id)}
                      disabled={actionLoading === result.id}
                      className="text-xs border border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 px-3 py-1 rounded hover:border-steve transition-colors disabled:opacity-40"
                    >
                      Add to pending
                    </button>
                  )}
                </div>
                <span className="text-xs text-warm-500">{expandedId === result.id ? '▲' : '▼'}</span>
              </div>

              {expandedId === result.id && result.diffCount > 0 && (
                <div className="px-4 bg-cream dark:bg-warm-800">
                  {Object.entries(result.diffs).map(([fieldName, diff]) => (
                    <DiffRow
                      key={fieldName}
                      fieldName={fieldName}
                      diff={diff}
                      entityType={result.entityType}
                      entityId={result.entityId}
                      initialChoice={getInitialChoice(result, fieldName)}
                      onChange={(f, choice, editedValue) => handleFieldChange(result.id, f, choice, editedValue)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
