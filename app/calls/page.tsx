'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Phone, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { subscribeCalls, archiveCall, restoreCall, deleteCall } from '@/lib/firestore'
import type { Call, DeliveryArea } from '@/types'
import { DELIVERY_AREA_LABELS } from '@/types'
import Modal from '@/components/Modal'
import CallForm from '@/components/calls/CallForm'
import Badge from '@/components/Badge'
import TableSkeleton from '@/components/skeletons/TableSkeleton'

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  detox: 'Detox',
  both: 'Both',
}

function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-TT', {
    day: 'numeric',
    month: 'short',
  })
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Call | undefined>()
  const [viewCall, setViewCall] = useState<Call | undefined>()
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    setLoading(true)
    return subscribeCalls((data) => {
      setCalls(data)
      setLoading(false)
    }, showArchived)
  }, [showArchived])

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(c: Call) {
    setEditing(c)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this client?')) return
    await archiveCall(id)
  }

  async function handleRestore(id: string) {
    await restoreCall(id)
  }

  async function handleDelete(id: string) {
    if (!confirm('PERMANENTLY DELETE this client? This cannot be undone.')) return
    await deleteCall(id)
  }

  const totalCalls = calls.length
  const sales = calls.filter((c) => c.outcome === 'sale').length
  const pending = calls.filter((c) => c.outcome === 'pending').length

  if (loading) return <TableSkeleton cols={7} rows={5} />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calls</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCalls} logged · {sales} sales · {pending} pending
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showArchived
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            <Archive size={16} />
            {showArchived ? 'View Active' : 'View Archived'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            <Plus size={16} />
            Log Call
          </button>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 flex flex-col items-center gap-3">
          <Phone size={40} className="text-gray-300" />
          <p className="text-gray-500 font-medium">{showArchived ? 'No archived calls' : 'No calls logged yet'}</p>
          {!showArchived && (
            <button
              onClick={openAdd}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              Log your first call
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Goal</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 hidden md:table-cell">Order</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{call.name}</td>
                    <td className="px-4 py-3 text-gray-600">{call.phone}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {call.goal ? GOAL_LABELS[call.goal] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={call.outcome === 'sale' ? 'sale' : call.outcome === 'not_a_sale' ? 'not_a_sale' : 'pending'}
                        label={call.outcome === 'sale' ? 'Sale' : call.outcome === 'not_a_sale' ? 'Not a Sale' : 'Pending'}
                      />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {call.orderId ? (
                        <Badge variant="sale" label="Order placed" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                      {fmt(call.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewCall(call)}
                          className="text-xs text-gray-500 hover:text-gray-800 underline px-1"
                        >
                          View
                        </button>

                        {!showArchived ? (
                          <>
                            <button
                              onClick={() => openEdit(call)}
                              className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleArchive(call.id)}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(call.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(call.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(call.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log / Edit call modal */}
      {showForm && (
        <Modal
          title={editing ? `Edit Call — ${editing.name}` : 'Log New Call'}
          onClose={closeForm}
          wide
        >
          <CallForm call={editing} onDone={closeForm} />
        </Modal>
      )}

      {/* View call details modal */}
      {viewCall && (
        <Modal
          title={`Call Details — ${viewCall.name}`}
          onClose={() => setViewCall(undefined)}
          wide
        >
          <CallDetail call={viewCall} onEdit={() => { setViewCall(undefined); openEdit(viewCall) }} />
        </Modal>
      )}
    </div>
  )
}

function CallDetail({ call, onEdit }: { call: Call; onEdit: () => void }) {
  const rows: [string, string | undefined | boolean][] = [
    ['Phone', call.phone],
    ['Goal', call.goal ? { lose_weight: 'Lose Weight', detox: 'Detox', both: 'Both' }[call.goal] : undefined],
    ['Current Weight', call.currentWeight],
    ['Goal Weight', call.goalWeight],
    ['Medical / Medications', call.medicalConditions],
    ['Previous Attempts', call.previousAttempts],
    ['Pregnant', call.pregnant ? 'Yes' : undefined],
    ['Breastfeeding', call.breastfeeding ? 'Yes' : undefined],
    ['Allergies', call.allergies],
    ['Routine Convenience', call.routineConvenience],
    ['Timeline', call.timeline],
    ['Interested Package', call.interestedPackage],
    ['Delivery Area', call.area ? DELIVERY_AREA_LABELS[call.area] : undefined],
    ['Address', call.address],
    ['Notes', call.notes],
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge
          variant={call.outcome === 'sale' ? 'sale' : call.outcome === 'not_a_sale' ? 'not_a_sale' : 'pending'}
          label={call.outcome === 'sale' ? 'Sale' : call.outcome === 'not_a_sale' ? 'Not a Sale' : 'Pending'}
        />
        {call.orderId && <Badge variant="neutral" label="Order placed" />}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt className="text-xs text-gray-400 font-medium">{label}</dt>
              <dd className="text-sm text-gray-800 mt-0.5">{String(value)}</dd>
            </div>
          ) : null
        )}
      </dl>

      <div className="pt-2 flex justify-end">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800"
        >
          <Pencil size={14} />
          Edit Call
        </button>
      </div>
    </div>
  )
}
