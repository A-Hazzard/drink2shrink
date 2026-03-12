'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import type { Call, Product, Order, DeliveryArea, OrderStatus, CallOutcome, OrderItem } from '@/types'
import { DELIVERY_FEES, DELIVERY_AREA_LABELS, DELIVERY_AREA_GROUPS } from '@/types'
import { addOrder, updateOrder, updateCall } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuth } from '@/contexts/AuthContext'


interface Props {
  calls: Call[]
  products: Product[]
  order?: Order          // present when editing
  onDone: () => void
}

export default function OrderForm({ order, calls, products, onDone }: Props) {
  const { user } = useAuth()
  const editing = !!order
  const { toast } = useToast()

  const [callId, setCallId] = useState(order?.callId ?? '')
  const [productId, setProductId] = useState(order?.items?.[0]?.productId || order?.productId || '')
  const [packageId, setPackageId] = useState(order?.items?.[0]?.packageId || order?.packageId || '')
  const [quantity, setQuantity] = useState<number>(order?.items?.[0]?.quantity || 1)
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

  const [area, setArea] = useState<DeliveryArea | ''>(order?.area ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? '')
  const [followUpDate, setFollowUpDate] = useState(order?.followUpDate ?? '')
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? 'pending')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCall = calls.find((c) => c.id === callId)
  const selectedProduct = products.find((p) => p.id === productId)
  const selectedPackage = selectedProduct?.packages.find((p) => p.id === packageId)
  const packagesTotal = items.reduce((sum, item) => sum + (item.packagePrice * item.quantity), 0)
  const deliveryFee = area ? DELIVERY_FEES[area] : 0
  const totalPrice = packagesTotal + deliveryFee

  // Pre-fill area from call record if available
  function handleCallChange(id: string) {
    setCallId(id)
    const c = calls.find((x) => x.id === id)
    if (c?.area) setArea(c.area)
  }

  // Reset package when product changes
  function handleProductChange(id: string) {
    setProductId(id)
    setPackageId('')
  }

  function handleAddItem() {
    setError('')
    if (!productId) return setError('Please select a product first.')
    if (!packageId) return setError('Please select a package.')
    if (!selectedProduct) return setError('Selected product not found.')
    if (!selectedPackage) return setError('Selected package not found.')
    if (quantity < 1) return setError('Quantity must be at least 1.')

    setItems(prev => [
      ...prev,
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        packageId: selectedPackage.id,
        packageTitle: selectedPackage.title,
        packagePrice: selectedPackage.price,
        quantity: quantity
      }
    ])
    setProductId('')
    setPackageId('')
    setQuantity(1)
    setError('')
  }

  function handleRemoveItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!callId) return setError('Please select a client.')

    // If items is empty but they have a package selected, auto-add it
    if (items.length === 0 && packageId && selectedPackage) {
      items.push({
        productId: selectedProduct!.id,
        productName: selectedProduct!.name,
        packageId: selectedPackage.id,
        packageTitle: selectedPackage.title,
        packagePrice: selectedPackage.price,
        quantity: quantity
      })
    }

    if (items.length === 0) return setError('Please add at least one package to the order (select product/package then click Add).')
    if (!area) return setError('Please select a delivery area.')
    if (!deliveryDate) return setError('Please select a delivery date.')
    if (status === 'interested_future' && !followUpDate) return setError('Please select a follow-up date.')
    if (!selectedCall) return

    setSaving(true)
    try {
      const payload: Omit<Order, 'id' | 'createdAt'> = {
        callId,
        clientName: selectedCall.name,
        clientPhone: selectedCall.phone,
        items,
        productId: items[0].productId,
        productName: items[0].productName,
        packageId: items[0].packageId,
        packageTitle: items[0].packageTitle,
        packagePrice: packagesTotal,
        area: area as DeliveryArea,
        deliveryFee,
        totalPrice,
        deliveryDate: deliveryDate || undefined,
        followUpDate: followUpDate || undefined,
        status,
        ownerEmail: user?.email || '',
      }

      if (editing) {
        await updateOrder(order.id, payload)
        // Sync call outcome
        if (order.callId) {
          await updateCall(order.callId, { outcome: status as CallOutcome })
        }
        toast('Order updated!')
      } else {
        await addOrder(payload, callId)
        toast('Order placed!')
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

  const eligibleCalls = useMemo(
    () => calls.filter((c) => !editing || c.id === callId),
    [calls, editing, callId]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar p-1">

      {/* Client */}
      <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Client Selection *</label>
        {editing ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3">
            <p className="text-sm font-black text-gray-900">{selectedCall?.name}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{selectedCall?.phone}</p>
          </div>
        ) : (
          <select
            value={callId}
            onChange={(e) => handleCallChange(e.target.value)}
            className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
          >
            <option value="">— Choose a Logged Call —</option>
            {eligibleCalls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Product & Package */}
      <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Product</label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            >
              <option value="">— Select Product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={`transition-all duration-300 ${productId ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Package & Qty</label>
            <div className="flex gap-2">
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="flex-1 min-w-0 bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— Select Package —</option>
                {selectedProduct?.packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.title} (${pkg.price})</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
      </section>

      {/* Delivery Details */}
      <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Delivery Area *</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as DeliveryArea)}
              className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            >
              <option value="">— Select Area —</option>
              {Object.entries(DELIVERY_AREA_GROUPS).map(([group, areas]) => (
                <optgroup key={group} label={group} className="text-[10px] uppercase font-black py-2 bg-white">
                  {areas.map((a) => (
                    <option key={a} value={a}>{DELIVERY_AREA_LABELS[a]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Delivery Date</label>
            <DatePicker
              date={deliveryDate ? parseISO(deliveryDate) : undefined}
              setDate={(d) => setDeliveryDate(d && isValid(d) ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Delivery date"
              className="bg-gray-50 border-transparent h-10 px-4 py-2"
            />
          </div>
        </div>
      </section>

      {/* Status Selection */}
      <section className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Current Order Status</label>
          <div className="flex flex-wrap gap-2.5">
            {(['pending', 'delivering', 'delivered', 'interested_future'] as OrderStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 min-w-[120px] px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${status === s
                  ? s === 'delivered' ? 'bg-green-600 border-green-700 text-white shadow-md'
                    : s === 'delivering' ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-900/10'
                      : s === 'interested_future' ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-900/10'
                        : 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-900/10'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                  }`}
              >
                {s === 'interested_future' ? 'Future Date' : s === 'delivered' ? 'Delivered' : s === 'delivering' ? 'Delivering' : 'Pending'}
              </button>
            ))}
          </div>
        </div>

        {status === 'interested_future' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Follow-up / Future Date *</label>
            <DatePicker
              date={followUpDate ? parseISO(followUpDate) : undefined}
              setDate={(d) => setFollowUpDate(d && isValid(d) ? format(d, 'yyyy-MM-dd') : '')}
              placeholder="Select future date"
              className="bg-white border-gray-100 py-6"
            />
          </div>
        )}
      </section>

      {/* Order Summary */}
      {items.length > 0 && area && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-[2rem] p-6 shadow-xl shadow-orange-900/5 transition-all">
          <p className="text-[10px] font-black text-orange-700 uppercase tracking-[0.2em] mb-4 text-center">Fulfillment Summary</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-orange-100 font-bold">
              <span className="text-gray-600 text-xs">Revenue</span>
              <span className="text-orange-700 font-black">${packagesTotal}</span>
            </div>
            <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-orange-100 font-bold">
              <span className="text-gray-600 text-xs">Delivery Fee</span>
              <span className="text-orange-700 font-black">${deliveryFee}</span>
            </div>
            <div className="flex justify-between items-center bg-orange-600 p-4 rounded-2xl shadow-lg shadow-orange-900/20 mt-2">
              <span className="text-white text-sm font-black uppercase tracking-widest">Total Pay</span>
              <span className="text-white text-2xl font-black tracking-tighter">${totalPrice}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
          <p className="text-xs font-black text-red-600 uppercase tracking-widest text-center">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
        <button
          type="button"
          onClick={onDone}
          className="w-full sm:w-auto px-10 py-4 text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-16 py-5 text-xs font-black text-white bg-orange-600 rounded-3xl hover:bg-orange-700 disabled:opacity-60 shadow-xl shadow-orange-900/10 transition-all active:scale-95 uppercase tracking-widest"
        >
          {saving ? 'Processing...' : editing ? 'Update Order Record' : 'Post Order'}
        </button>
      </div>
    </form>
  )
}
