'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import type { Call, CallGoal, CallOutcome, OrderStatus, DeliveryArea, Product, Order, OrderItem } from '@/types'
import { DELIVERY_AREA_LABELS, DELIVERY_AREA_GROUPS, DELIVERY_FEES } from '@/types'
import { addCall, updateCall, addOrder, updateOrder } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  call?: Call
  order?: Order
  products: Product[]
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
  followUpDate: '',
  ownerEmail: '',
})

export default function CallForm({ call, order, products, onDone }: Props) {
  const editing = !!call
  const { user } = useAuth()
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
        followUpDate: call.followUpDate ?? '',
        ownerEmail: call.ownerEmail ?? '',
      }
      : initialState()
  )

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (order?.items && order.items.length > 0) return order.items
    if (order?.productId && order?.packageId) {
      return [{
        productId: order.productId,
        productName: order.productName || '',
        packageId: order.packageId,
        packageTitle: order.packageTitle || '',
        packagePrice: order.packagePrice || 0,
        quantity: 1
      }]
    }
    return []
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedProduct = useMemo(() =>
    products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const selectedPackage = useMemo(() =>
    selectedProduct?.packages.find(pkg => pkg.id === selectedPackageId),
    [selectedProduct, selectedPackageId]
  )

  function handleAddItem() {
    setError('')
    if (!selectedProductId) return setError('Please select a product first.')
    if (!selectedPackageId) return setError('Please select a package.')
    if (!selectedProduct) return setError('Selected product not found.')
    if (!selectedPackage) return setError('Selected package not found.')
    if (selectedQuantity < 1) return setError('Quantity must be at least 1.')

    setItems(prev => [
      ...prev,
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        packageId: selectedPackage.id,
        packageTitle: selectedPackage.title,
        packagePrice: selectedPackage.price,
        quantity: selectedQuantity
      }
    ])
    setSelectedProductId('')
    setSelectedPackageId('')
    setSelectedQuantity(1)
    setError('')
  }

  function handleRemoveItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showWeightFields = form.goal === 'lose_weight' || form.goal === 'both'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.phone.trim()) return setError('Phone number is required.')

    const requiresOrder = form.outcome === 'delivered' || form.outcome === 'delivering' || form.outcome === 'interested_future'
    if (requiresOrder) {
      // If items is empty but they have a package selected, auto-add it
      if (items.length === 0 && selectedPackageId && selectedPackage) {
        items.push({
          productId: selectedProduct!.id,
          productName: selectedProduct!.name,
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          packagePrice: selectedPackage.price,
          quantity: selectedQuantity
        })
      }

      if (items.length === 0) return setError('Please add a package to the order (select product/package then click Add).')
      if (!form.area) return setError('Please select a delivery area.')
      if (form.outcome === 'interested_future' && !form.followUpDate) return setError('Please select a follow-up date.')
    }

    setSaving(true)
    try {
      let callId = call?.id

      if (editing) {
        await updateCall(call.id, { ...form, ownerEmail: user?.email || '' })
        callId = call.id
        toast('Call updated!')
      } else {
        const payload = { ...form, ownerEmail: user?.email || '' }
        const ref = await addCall(payload)
        callId = ref.id
        toast('Call logged!')
      }

      // Automatically place order if it's a sale
      if (requiresOrder && callId && items.length > 0 && form.area) {
        const deliveryFee = DELIVERY_FEES[form.area]
        const packagePrice = items.reduce((sum, item) => sum + (item.packagePrice * item.quantity), 0)

        const orderPayload: Omit<Order, 'id' | 'createdAt'> = {
          callId,
          clientName: form.name,
          clientPhone: form.phone,
          items, // set items
          // Add first item's details as fallback for backward compatibility
          productId: items[0].productId,
          productName: items[0].productName,
          packageId: items[0].packageId,
          packageTitle: items[0].packageTitle,
          packagePrice,
          area: form.area,
          deliveryFee,
          totalPrice: packagePrice + deliveryFee,
          status: form.outcome as OrderStatus, // Cast since types align
          followUpDate: form.followUpDate,
          ownerEmail: user?.email || '',
        }
        if (order?.id) {
          await updateOrder(order.id, orderPayload)
          toast('Order updated successfully!')
        } else {
          await addOrder(orderPayload, callId)
          toast('Order linked successfully!')
        }
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
    <div className="space-y-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar p-1">
      <form onSubmit={handleSubmit} className="space-y-8 pb-10">

        {/* Intro Script */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-2xl shadow-sm">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Greeting Script</p>
          <p className="text-sm italic text-gray-700 leading-relaxed font-medium">
            "Hi, good morning! This is <span className="text-blue-700 font-black">HealthIsWealthTT</span>. I’m calling concerning your interest in the <span className="text-blue-700 font-black uppercase">Drink2Shrink</span> product. Correct?"
          </p>
          <p className="text-[10px] text-blue-400 mt-3 font-bold uppercase tracking-tight">(Wait for reply. Then continue: "Great! Could I ask you just a few questions firstly just to ensure you're the right fit for the product?")</p>
        </div>

        {/* Section 1: Basic Info */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Step 1: Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-300"
                placeholder="Client Name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-gray-300"
                placeholder="Contact #"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Goals */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm">
            <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Script Q1</p>
            <p className="text-sm italic text-gray-700 font-medium">
              "So what is your goal with the Drink2Shrink is it to <span className="text-green-700 font-black underline">Lose weight</span> or for a <span className="text-green-700 font-black underline">General Detox</span>?"
            </p>
          </div>

          <div>
            <div className="flex flex-wrap gap-3">
              {(['lose_weight', 'detox', 'both'] as CallGoal[]).map((g) => (
                <label key={g} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 cursor-pointer p-4 rounded-2xl border-2 transition-all active:scale-95 ${form.goal === g ? 'border-green-600 bg-green-50 shadow-md shadow-green-900/5' : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'
                  }`}>
                  <input
                    type="radio"
                    name="goal"
                    checked={form.goal === g}
                    onChange={() => set('goal', g)}
                    className="hidden"
                  />
                  <span className={`text-xs font-black uppercase tracking-widest ${form.goal === g ? 'text-green-700' : 'text-gray-400'}`}>
                    {g === 'lose_weight' ? 'Lose Weight' : g === 'detox' ? 'Detox' : 'Both'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {showWeightFields && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 italic">"Current weight?"</label>
                <input
                  type="text"
                  value={form.currentWeight}
                  onChange={(e) => set('currentWeight', e.target.value)}
                  className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="lbs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 italic">"Goal weight?"</label>
                <input
                  type="text"
                  value={form.goalWeight}
                  onChange={(e) => set('goalWeight', e.target.value)}
                  className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="lbs"
                />
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Medical & History */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm">
            <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Script Q2 & Q3</p>
            <p className="text-sm italic text-gray-700 font-medium">
              "Do you have any medical conditions or taking medication? High blood pressure or diabetes? Have you tried anything else to lose weight or detox in the past?"
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Medical Conditions / Meds</label>
              <input
                type="text"
                value={form.medicalConditions}
                onChange={(e) => set('medicalConditions', e.target.value)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Note conditions if any..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Previous Experience</label>
              <textarea
                value={form.previousAttempts}
                onChange={(e) => set('previousAttempts', e.target.value)}
                rows={2}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="How was their experience with other products?"
              />
            </div>

            <div className="flex flex-wrap gap-3 py-4 border-y border-gray-50">
              <label className="flex items-center gap-3 cursor-pointer bg-red-50 px-5 py-3 rounded-2xl border-2 border-transparent hover:border-red-100 transition-all active:scale-95">
                <input
                  type="checkbox"
                  checked={form.pregnant ?? false}
                  onChange={(e) => set('pregnant', e.target.checked)}
                  className="accent-red-600 w-5 h-5 rounded-lg"
                />
                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Pregnant?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-blue-50 px-5 py-3 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all active:scale-95">
                <input
                  type="checkbox"
                  checked={form.breastfeeding ?? false}
                  onChange={(e) => set('breastfeeding', e.target.checked)}
                  className="accent-blue-600 w-5 h-5 rounded-lg"
                />
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Breastfeeding?</span>
              </label>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={form.allergies}
                  onChange={(e) => set('allergies', e.target.value)}
                  className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-green-500 placeholder:text-gray-300"
                  placeholder="Any allergies?"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Recommendation & Lifestyle */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-2xl shadow-sm">
            <p className="text-xs font-black text-purple-700 uppercase tracking-widest mb-2">Step 4: The Recommendation</p>
            <p className="text-sm italic text-gray-700 mb-4 font-medium leading-relaxed">
              "Based on your answers, Drink2Shrink would be a suitable product for you to achieve your goal of <span className="text-purple-700 font-black underline uppercase">{form.goal === 'lose_weight' ? 'Weight Loss' : 'Detox'}</span>."
            </p>
            <div className="bg-white/60 p-4 rounded-xl border border-purple-100/50">
              <p className="text-[10px] font-black text-purple-900 leading-relaxed uppercase tracking-widest mb-1.5 opacity-50">How it Works (Directions):</p>
              <p className="text-xs font-medium text-purple-800 leading-relaxed">
                Mix contents with 12 ounces of water until dissolved. Drink before bed.
              </p>
            </div>

            <div className="bg-white border-l-4 border-purple-400 p-4 rounded-r-xl shadow-sm">
              <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-2">Product Explanation Script</p>
              <p className="text-xs font-medium text-gray-700 leading-relaxed italic">
                "Drink2Shrink is a caffeine-free herbal infusion that naturally cleanses and detoxifies your body to restore healthy balance and improve its ability to heal itself. It boosts focus and energy while supporting weight management. It features <span className="font-black text-purple-700 underline">Cassia Angustifolia</span>, which acts as a gentle yet effective natural herbal laxative."
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 italic leading-tight">"Daily Routine Convenience?"</label>
              <input
                type="text"
                value={form.routineConvenience}
                onChange={(e) => set('routineConvenience', e.target.value)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Work shifts, kids, etc."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 italic leading-tight">"Goal Timeline?"</label>
              <input
                type="text"
                value={form.timeline}
                onChange={(e) => set('timeline', e.target.value)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ASAP, Specific event?"
              />
            </div>
          </div>
        </section>

        {/* Section 5: Closing & Order (The Instant Ordering Part) */}
        <section className="bg-white p-6 rounded-3xl border-2 border-orange-500 shadow-xl shadow-orange-900/5 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Orders Connected</div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm">
            <p className="text-xs font-black text-orange-700 uppercase tracking-widest mb-1">Step 7: The Close (Mention Price)</p>
            <p className="text-xs text-orange-900 font-bold leading-relaxed">
              1-Week: <span className="underline">$150</span> · 2-Weeks: <span className="underline">$270</span> · 1-Month: <span className="underline">$600</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assign Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value)
                  setSelectedPackageId('')
                }}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="">— Select Product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className={`transition-all duration-300 ${selectedProductId ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assign Package & Qty</label>
              <div className="flex gap-2">
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="flex-1 min-w-0 bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">— Select Package —</option>
                  {selectedProduct?.packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.title} (${pkg.price})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 bg-gray-50 border-transparent rounded-2xl px-2 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 bg-orange-600 text-white text-xs font-black rounded-2xl hover:bg-orange-700 transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cart Items</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{item.productName}</p>
                    <p className="text-[10px] font-bold text-gray-500 truncate">{item.packageTitle} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <p className="text-sm font-black text-orange-700">${item.packagePrice * item.quantity}</p>
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500 text-lg leading-none font-bold px-1">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Delivery Area</label>
              <select
                value={form.area ?? ''}
                onChange={(e) => set('area', (e.target.value as DeliveryArea) || undefined)}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— Select Area —</option>
                {Object.entries(DELIVERY_AREA_GROUPS).map(([group, areas]) => (
                  <optgroup key={group} label={group} className="text-[10px] uppercase font-black tracking-widest py-2 bg-white">
                    {areas.map((a) => (
                      <option key={a} value={a} className="font-bold text-gray-700 capitalize">
                        {DELIVERY_AREA_LABELS[a]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Delivery Address</label>
              <textarea
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                rows={1}
                className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-all"
                placeholder="Street name, Landmark..."
              />
            </div>
          </div>

          {items.length > 0 && form.area && (
            <div className="bg-orange-500 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg shadow-orange-900/20 active:scale-[0.99] transition-all">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Order Summary</p>
                <p className="text-2xl font-black tracking-tighter">${items.reduce((sum, item) => sum + (item.packagePrice * item.quantity), 0) + DELIVERY_FEES[form.area]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest">{items.length} Item{items.length !== 1 ? 's' : ''}</p>
                <p className="text-[10px] font-bold opacity-70">Incl. ${DELIVERY_FEES[form.area]} delivery</p>
              </div>
            </div>
          )}
        </section>

        {/* Final Selection & Outcome - REDESIGNED TO LIGHT THEME */}
        <section className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.3em] ml-1">Final Log Status</label>
            <div className="flex flex-wrap gap-2.5">
              {(['pending', 'delivered', 'delivering', 'rejected', 'interested_future'] as CallOutcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set('outcome', o)}
                  className={`flex-1 min-w-[140px] px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${form.outcome === o
                    ? o === 'delivered' ? 'bg-green-600 border-green-700 text-white shadow-lg shadow-green-900/10'
                      : o === 'delivering' ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-900/10'
                        : o === 'rejected' ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-900/10'
                          : o === 'interested_future' ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-900/10'
                            : 'bg-white border-gray-900 text-gray-900 shadow-sm'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                    }`}
                >
                  {o === 'rejected' ? 'Rejected' : o === 'delivered' ? 'Delivered Sales' : o === 'delivering' ? 'Delivering' : o === 'interested_future' ? 'Interested (Future Date)' : 'Still Pending'}
                </button>
              ))}
            </div>
          </div>

          {form.outcome === 'interested_future' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Follow-up / Future Delivery Date</label>
              <DatePicker
                date={form.followUpDate ? parseISO(form.followUpDate) : undefined}
                setDate={(d) => set('followUpDate', d && isValid(d) ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Select date"
                className="bg-white border-gray-100 py-6"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Internal Log Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-all placeholder:text-gray-300 shadow-sm"
              placeholder="Any other specific requests or notes?"
            />
          </div>
        </section>

        {/* Section 6: Product Knowledge FAQ */}
        <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Quick Reference FAQ</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drink2Shrink FAQ */}
            <div className="bg-green-50/50 p-5 rounded-3xl border border-green-100/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌿</span>
                <h4 className="text-xs font-black text-green-800 uppercase tracking-wider">Drink2Shrink</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1 opacity-60">Target</p>
                  <p className="text-xs font-bold text-gray-700">Bloating, constipation & waste buildup</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1 opacity-60">How it works</p>
                  <p className="text-[11px] font-medium text-gray-600 leading-relaxed">Gently cleanses your digestive tract while you sleep so you feel lighter by morning.</p>
                </div>
              </div>
            </div>

            {/* EpicSlim Collagen FAQ */}
            <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🍍</span>
                <h4 className="text-xs font-black text-orange-800 uppercase tracking-wider">EpicSlim Collagen</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 opacity-60">Target</p>
                  <p className="text-xs font-bold text-gray-700">Appetite, Metabolism & Skin/Joints</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 opacity-60">Formula</p>
                  <p className="text-[11px] font-medium text-gray-600 leading-relaxed">Pina Colada flavor, 10g Collagen, Berberine & CaloriBurn GP®.</p>
                </div>
              </div>
            </div>

            {/* EpicSlim Coffee FAQ */}
            <div className="bg-brown-50/50 p-5 rounded-3xl border border-gray-100" style={{ backgroundColor: '#fdf8f4' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">☕</span>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">EpicSlim Coffee</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1 opacity-60">Target</p>
                  <p className="text-xs font-bold text-gray-700">Energy Focus & Fat Burning</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1 opacity-60">Key Info</p>
                  <p className="text-[11px] font-medium text-gray-600 leading-relaxed">75mg Cafeine, 10g Collagen & Lion's Mane Mushrooms for recovery.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
            <p className="text-xs font-black text-red-600 uppercase tracking-widest text-center">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
          <button
            type="button"
            onClick={onDone}
            className="w-full sm:w-auto px-10 py-4 text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-16 py-5 text-xs font-black text-white bg-green-700 rounded-3xl hover:bg-green-800 disabled:opacity-60 shadow-xl shadow-green-900/10 transition-all active:scale-95 uppercase tracking-widest"
          >
            {saving ? 'Processing...' : editing ? 'Update Records' : 'Finalize & Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
