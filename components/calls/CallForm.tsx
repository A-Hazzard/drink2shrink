'use client'

import { useState } from 'react'
import type { Call, CallGoal, CallOutcome, DeliveryArea } from '@/types'
import { DELIVERY_AREA_LABELS, DELIVERY_AREA_GROUPS } from '@/types'
import { addCall, updateCall } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import Spinner from '@/components/Spinner'

interface Props {
  call?: Call
  onDone: () => void
}

const initialState = (): Omit<Call, 'id' | 'createdAt'> => ({
  name: '',
  phone: '',
  goal: undefined,
  currentWeight: '',
  goalWeight: '',
  medicalConditions: '',
  previousAttempts: '',
  pregnant: false,
  breastfeeding: false,
  allergies: '',
  routineConvenience: '',
  timeline: '',
  interestedPackage: '',
  area: undefined,
  address: '',
  outcome: 'pending',
  notes: '',
})

export default function CallForm({ call, onDone }: Props) {
  const editing = !!call
  const { toast } = useToast()
  const [form, setForm] = useState<Omit<Call, 'id' | 'createdAt'>>(
    call
      ? {
        name: call.name,
        phone: call.phone,
        goal: call.goal,
        currentWeight: call.currentWeight ?? '',
        goalWeight: call.goalWeight ?? '',
        medicalConditions: call.medicalConditions ?? '',
        previousAttempts: call.previousAttempts ?? '',
        pregnant: call.pregnant ?? false,
        breastfeeding: call.breastfeeding ?? false,
        allergies: call.allergies ?? '',
        routineConvenience: call.routineConvenience ?? '',
        timeline: call.timeline ?? '',
        interestedPackage: call.interestedPackage ?? '',
        area: call.area,
        address: call.address ?? '',
        outcome: call.outcome,
        notes: call.notes ?? '',
        orderId: call.orderId,
      }
      : initialState()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showWeightFields = form.goal === 'lose_weight' || form.goal === 'both'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.phone.trim()) return setError('Phone number is required.')

    setSaving(true)
    try {
      if (editing) {
        await updateCall(call.id, form)
        toast('Call updated!')
      } else {
        await addCall(form)
        toast('Call logged!')
      }
      onDone()
    } catch (err) {
      setError('Failed to save. Please try again.')
      toast('Failed to save. Please try again.', 'error')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

      {/* Section 1: Basic Info */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Basic Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 868-123-4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Area</label>
            <select
              value={form.area ?? ''}
              onChange={(e) => set('area', (e.target.value as DeliveryArea) || undefined)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">— Not answered —</option>
              {Object.entries(DELIVERY_AREA_GROUPS).map(([group, areas]) => (
                <optgroup key={group} label={group}>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {DELIVERY_AREA_LABELS[a]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 12 Street Name, Town"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Goals */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Q1 — Goal
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What is your goal with Drink2Shrink?
          </label>
          <div className="flex flex-wrap gap-3">
            {(['lose_weight', 'detox', 'both'] as CallGoal[]).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="goal"
                  checked={form.goal === g}
                  onChange={() => set('goal', g)}
                  className="accent-green-700"
                />
                <span className="text-sm text-gray-700 capitalize">
                  {g === 'lose_weight' ? 'Lose Weight' : g === 'detox' ? 'Detox' : 'Both'}
                </span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="goal"
                checked={!form.goal}
                onChange={() => set('goal', undefined)}
                className="accent-green-700"
              />
              <span className="text-sm text-gray-400">Not answered</span>
            </label>
          </div>
        </div>

        {showWeightFields && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Weight</label>
              <input
                type="text"
                value={form.currentWeight}
                onChange={(e) => set('currentWeight', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 180 lbs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal / Target Weight</label>
              <input
                type="text"
                value={form.goalWeight}
                onChange={(e) => set('goalWeight', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 150 lbs"
              />
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Medical & History */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Q2–Q3 — Medical &amp; History
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medical conditions or medications?
            </label>
            <input
              type="text"
              value={form.medicalConditions}
              onChange={(e) => set('medicalConditions', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. High blood pressure, diabetes, pressure tab…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tried anything else before? Experience / results?
            </label>
            <textarea
              value={form.previousAttempts}
              onChange={(e) => set('previousAttempts', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="e.g. No cool and cleanser, tried detox tea before…"
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pregnant ?? false}
                onChange={(e) => set('pregnant', e.target.checked)}
                className="accent-green-700 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Currently pregnant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.breastfeeding ?? false}
                onChange={(e) => set('breastfeeding', e.target.checked)}
                className="accent-green-700 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Breastfeeding</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Any allergies?</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => set('allergies', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. None / list any allergies"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Lifestyle */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Q5–Q6 — Lifestyle &amp; Timeline
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How convenient is it to take D2S in their daily routine?
            </label>
            <input
              type="text"
              value={form.routineConvenience}
              onChange={(e) => set('routineConvenience', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Works nights, will take during day…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How soon would they like to achieve their goal?
            </label>
            <input
              type="text"
              value={form.timeline}
              onChange={(e) => set('timeline', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 1 month, ASAP, by end of year…"
            />
          </div>
        </div>
      </section>

      {/* Section 5: Package Interest */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Q7 — Package &amp; Delivery
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Which package are they leaning towards?
            </label>
            <select
              value={form.interestedPackage ?? ''}
              onChange={(e) => set('interestedPackage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">— Not answered —</option>
              <option value="1_week">1-Week Supply (5 sachets) — $150</option>
              <option value="2_week">2-Week Supply (10 sachets) — $270</option>
              <option value="month">Month Supply (28 sachets) — $600</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 6: Outcome */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Outcome
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Call result</label>
            <div className="flex flex-wrap gap-3">
              {(['pending', 'sale', 'not_a_sale'] as CallOutcome[]).map((o) => (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    checked={form.outcome === o}
                    onChange={() => set('outcome', o)}
                    className="accent-green-700"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {o === 'not_a_sale' ? 'Not a Sale' : o === 'sale' ? 'Sale' : 'Pending'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Any extra notes about this call…"
            />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-60"
        >
          {saving ? <><Spinner size={15} className="inline mr-1" />Saving…</> : editing ? 'Update Call' : 'Log Call'}
        </button>
      </div>
    </form>
  )
}
