'use client'

import { useState } from 'react'
import type { Call, CallGoal, CallOutcome, DeliveryArea } from '@/types'
import { DELIVERY_AREA_LABELS, DELIVERY_AREA_GROUPS } from '@/types'
import { addCall, updateCall } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'

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
    <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
      <form onSubmit={handleSubmit} className="space-y-8 pb-10">

        {/* Intro Script */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
          <p className="text-xs font-bold text-blue-600 uppercase mb-2">Greeting Script</p>
          <p className="text-sm italic text-gray-700 leading-relaxed">
            "Hi, good morning! This is <span className="font-bold underline">HealthIsWealthTT</span>. I’m calling concerning your interest in the <span className="font-bold uppercase">Drink2Shrink</span> product. Correct?"
          </p>
          <p className="text-[10px] text-blue-400 mt-2 font-medium">(Wait for reply. Then continue: "Great! Could I ask you just a few questions firstly just to ensure you're the right fit for the product?")</p>
        </div>

        {/* Section 1: Basic Info */}
        <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Step 1: Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Client Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Contact #"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Goals */}
        <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg mb-2">
            <p className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
              <span>Script Q1</span>
            </p>
            <p className="text-sm italic text-gray-700">
              "So what is your goal with the Drink2Shrink is it to <span className="font-semibold underline">Lose weight</span> or for a <span className="font-semibold underline">General Detox</span>?"
            </p>
          </div>

          <div>
            <div className="flex flex-wrap gap-4 pt-2">
              {(['lose_weight', 'detox', 'both'] as CallGoal[]).map((g) => (
                <label key={g} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all ${form.goal === g ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <input
                    type="radio"
                    name="goal"
                    checked={form.goal === g}
                    onChange={() => set('goal', g)}
                    className="hidden"
                  />
                  <span className={`text-sm font-bold ${form.goal === g ? 'text-green-700' : 'text-gray-500'}`}>
                    {g === 'lose_weight' ? 'Lose Weight' : g === 'detox' ? 'Detox' : 'Both'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {showWeightFields && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 italic">"What is your weight currently?"</label>
                <input
                  type="text"
                  value={form.currentWeight}
                  onChange={(e) => set('currentWeight', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Current lbs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 italic">"What's your goal target?"</label>
                <input
                  type="text"
                  value={form.goalWeight}
                  onChange={(e) => set('goalWeight', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Goal lbs"
                />
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Medical & History */}
        <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">Script Q2 & Q3</p>
              <p className="text-sm italic text-gray-700">
                "Do you have any medical conditions or taking medication? High blood pressure or diabetes? Have you tried anything else to lose weight or detox in the past?"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider text-gray-400">Medical Conditions / Meds</label>
              <input
                type="text"
                value={form.medicalConditions}
                onChange={(e) => set('medicalConditions', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Note conditions if any..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider text-gray-400">Previous Experience</label>
              <textarea
                value={form.previousAttempts}
                onChange={(e) => set('previousAttempts', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-medium text-gray-600"
                placeholder="How was their experience?"
              />
            </div>

            <div className="flex flex-wrap gap-4 py-2 border-y border-gray-50">
              <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                <input
                  type="checkbox"
                  checked={form.pregnant ?? false}
                  onChange={(e) => set('pregnant', e.target.checked)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-xs font-bold text-red-700">Pregnant?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <input
                  type="checkbox"
                  checked={form.breastfeeding ?? false}
                  onChange={(e) => set('breastfeeding', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-xs font-bold text-blue-700">Breastfeeding?</span>
              </label>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={form.allergies}
                  onChange={(e) => set('allergies', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-green-500"
                  placeholder="Any allergies?"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Recommendation & Lifestyle */}
        <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-xl">
            <p className="text-xs font-bold text-purple-700 uppercase mb-2">Step 4: The Recommendation</p>
            <p className="text-sm italic text-gray-700 mb-3">
              "Based on your answers, Drink2Shrink would be a suitable product for you to achieve your goal of <span className="font-bold underline uppercase">{form.goal === 'lose_weight' ? 'Weight Loss' : 'Detox'}</span>."
            </p>
            <p className="text-xs font-medium text-purple-900 bg-white/50 p-2 rounded leading-relaxed border border-purple-100">
              <span className="font-bold">How it works:</span> You add the substance to a small bottle of water (6 to 8 ounces) room temperature or cold. Shake it up and drink before bed. First thing in the morning, you’ll get light gripes and bowel movements as the detox begins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-[11px] uppercase text-gray-400 font-bold tracking-wider italic">"How convenient will it be for you?"</label>
              <input
                type="text"
                value={form.routineConvenience}
                onChange={(e) => set('routineConvenience', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Day vs Night shift..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-[11px] uppercase text-gray-400 font-bold tracking-wider italic">"How soon to achieve your goal?"</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => set('timeline', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ASAP, 1 month, etc."
              />
            </div>
          </div>
        </section>

        {/* Section 5: Closing & Order */}
        <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg">
            <p className="text-xs font-bold text-orange-700 uppercase mb-1">Step 7: The Close (Mention Price)</p>
            <p className="text-xs text-orange-900 leading-tight">
              1-Week (5 sachets): <span className="font-bold underline">$150</span> ·
              2-Weeks (10 sachets): <span className="font-bold underline">$270</span> ·
              1-Month (28 sachets): <span className="font-bold underline">$600</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-bold italic">Interested Package</label>
              <select
                value={form.interestedPackage ?? ''}
                onChange={(e) => set('interestedPackage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">— Lean towards... —</option>
                <option value="1_week">1-Week Supply ($150)</option>
                <option value="2_week">2-Week Supply ($270)</option>
                <option value="month">Month Supply ($600)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-bold italic">Delivery Area</label>
              <select
                value={form.area ?? ''}
                onChange={(e) => set('area', (e.target.value as DeliveryArea) || undefined)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">— Which Area? —</option>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-bold italic">Detailed Delivery Address</label>
            <textarea
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-medium"
              placeholder="House #, Street name, Landmark..."
            />
          </div>
        </section>

        {/* Final Selection & Outcome */}
        <section className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-3 uppercase tracking-tighter">Current Status</label>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'sale', 'not_a_sale', 'out_for_delivery'] as CallOutcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set('outcome', o)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${form.outcome === o
                    ? 'bg-green-700 text-white border-green-700 shadow-md ring-2 ring-green-100 ring-offset-1'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {o === 'not_a_sale' ? 'Rejected' : o === 'sale' ? 'Delivered Sales' : o === 'out_for_delivery' ? 'Delivering' : 'Still Pending'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Any other quesions or queries?"
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-600 animate-bounce">{error}</p>}

        <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onDone}
            className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            DISCARD
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-10 py-3 text-sm font-black text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-60 shadow-lg shadow-green-100 transition-all active:scale-95"
          >
            {saving ? 'SAVING...' : editing ? 'UPDATE LOG' : 'COMPLETE LOG'}
          </button>
        </div>

        {/* FAQ Section */}
        <section className="mt-12 pt-12 border-t-2 border-gray-100 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Consultant Quick-Ref Guide</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Product FAQ & Knowledge Base</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drink2Shrink */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center font-bold text-green-700 uppercase italic">D2S</div>
                <h4 className="font-bold text-gray-800">Digestion & Bloating</h4>
              </div>
              <p className="text-xs text-gray-500 italic leading-relaxed">
                "So, this one is basically a blend of herbs that helps your digestion catch up. It’s a caffeine-free drink you take before bed to help clear out waste and reduce that heavy, bloated feeling by the time you wake up. It isn't harsh; it just uses natural ingredients to help your system work a bit more efficiently."
              </p>
              <ul className="text-[10px] space-y-1 text-gray-600 border-t pt-2 border-gray-50">
                <li>• <span className="font-bold">Cassia Angustifolia:</span> Helps move waste along.</li>
                <li>• <span className="font-bold">Digestive Comfort:</span> Ginger & Chamomile for gentle stomach care.</li>
              </ul>
            </div>

            {/* EpicSlim Collagen */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center font-bold text-orange-700 uppercase italic">COLL</div>
                <h4 className="font-bold text-gray-800">Metabolism & Skin</h4>
              </div>
              <p className="text-xs text-gray-500 italic leading-relaxed">
                "This is a Piña Colada flavored drink that handles two things: your metabolism and your skin health. It helps you manage your appetite so you aren't snacking as much, while the collagen works on your hair, skin, and joints."
              </p>
              <ul className="text-[10px] space-y-1 text-gray-600 border-t pt-2 border-gray-50">
                <li>• <span className="font-bold">10g Collagen:</span> Bone, joint and skin peptides (Types I & III).</li>
                <li>• <span className="font-bold">Berberine & CaloriBurn:</span> Manages sugar and burns extra calories.</li>
              </ul>
            </div>

            {/* EpicSlim Coffee */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brown-100 flex items-center justify-center font-bold text-yellow-900 bg-yellow-100 uppercase italic">COF</div>
                <h4 className="font-bold text-gray-800">Energy & Focus</h4>
              </div>
              <p className="text-xs text-gray-500 italic leading-relaxed">
                "Much cleaner option than a standard brew. Arabica coffee mixed with collagen and mushrooms. Gives steady energy and focus for your workday while suppressing cravings."
              </p>
              <ul className="text-[10px] space-y-1 text-gray-600 border-t pt-2 border-gray-50">
                <li>• <span className="font-bold">Natural Caffeine:</span> ~75mg per serving.</li>
                <li>• <span className="font-bold">Mental Focus:</span> Includes Lion's Mane and Cordyceps mushrooms.</li>
              </ul>
            </div>

            {/* ACTIV Greens */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 uppercase italic">GRE</div>
                <h4 className="font-bold text-gray-800">Daily Nutrition</h4>
              </div>
              <p className="text-xs text-gray-500 italic leading-relaxed">
                "Daily source of vitamins and minerals from organic vegetables. Superfoods and adaptogens that help support your immune system and keep energy levels steady."
              </p>
              <ul className="text-[10px] space-y-1 text-gray-600 border-t pt-2 border-gray-50">
                <li>• <span className="font-bold">Organic Blend:</span> Varieties of greens, fruits and vegetables.</li>
                <li>• <span className="font-bold">Raw Concentrates:</span> For easy and effective absorption.</li>
              </ul>
            </div>
          </div>
        </section>

      </form>
    </div>
  )
}
