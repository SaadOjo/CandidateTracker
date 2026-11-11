import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../data/api'
import { ErrorMessage } from '../feedback/ErrorMessage'

export function CloudflareDemoReset() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function reset() {
    setBusy(true)
    setError(null)
    try {
      await apiRequest('/demo/reset', { method: 'POST', body: JSON.stringify({ confirmation: 'DELETE ALL TEST DATA' }) })
      await queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== 'auth' })
      setOpen(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not reset demo')
    } finally { setBusy(false) }
  }
  return (
    <>
      <button className="inline-flex h-9 items-center gap-2 rounded-md border button button-danger px-3 text-sm font-bold" type="button" onClick={() => { setError(null); setOpen(true) }}>
        <Trash2 size={16} /> Reset demo
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-backdrop p-8 backdrop-blur-[3px]">
          <section className="relative w-[460px] rounded-lg border border-border bg-white p-7 shadow-modal" role="alertdialog" aria-modal="true" aria-labelledby="demo-reset-title" aria-describedby="demo-reset-description">
            <button className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full button button-text" type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Cancel reset"><X size={16} /></button>
            <h2 id="demo-reset-title" className="mt-0 mr-6 mb-3 text-xl font-bold text-heading">Reset test data?</h2>
            <p id="demo-reset-description" className="m-0 text-sm leading-6 text-body">Delete all projects, candidates, notes, and activity in this demo. RSC data stays available to import again. This cannot be undone here.</p>
            {error && <ErrorMessage className="mt-4" message={error} />}
            <div className="mt-6 flex justify-end gap-3">
              <button className="h-10 rounded-md border button button-secondary px-4 text-sm font-bold" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              <button className="h-10 rounded-md border button button-danger px-4 text-sm font-bold" type="button" disabled={busy} onClick={() => void reset()}>{busy ? 'Deleting…' : 'Delete all test data'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
