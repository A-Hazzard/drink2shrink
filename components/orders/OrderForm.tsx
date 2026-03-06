'use client'

import { useState, useMemo } from 'react'
import type { Call, Product, Order, DeliveryArea } from '@/types'
import { DELIVERY_FEES, DELIVERY_AREA_LABELS, DELIVERY_AREA_GROUPS } from '@/types'
import { addOrder, updateOrder } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import Spinner from '@/components/Spinner'

interface Props {
  calls: Call[]
  products: Product[]
  order?: Order          // present when editing
  onDone: () => void
}

export default function OrderForm({ calls, products, order, onDone }: Props) {
  const editing = !!order
  const { toast } = useToast()

  const [callId, setCallId] = useState(order?.callId ?? '')
  const [productId, setProductId] = useState(order?.productId ?? '')
  const [packageId, setPackageId] = useState(order?.packageId ?? '')
  const [area, setArea] = useState<DeliveryArea | ''>(order?.area ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? '')
  const [status, setStatus] = useState<Order['status']>(order?.status ?? 'pending')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCall = calls.find((c) => c.id === callId)
  const selectedProduct = products.find((p) => p.id === productId)
  const selectedPackage = selectedProduct?.packages.find((p) => p.id === packageId)
  const deliveryFee = area ? DELIVERY_FEES[area] : 0
  const totalPrice = (selectedPackage?.price ?? 0) + deliveryFee

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!callId) return setError('Please select a client.')
    if (!productId) return setError('Please select a product.')
    if (!packageId) return setError('Please select a package.')
    if (!area) return setError('Please select a delivery area.')
    if (!selectedCall || !selectedPackage || !selectedProduct) return

    setSaving(true)
    try {
      const payload: Omit<Order, 'id' | 'createdAt'> = {
        callId,
        clientName: selectedCall.name,
        clientPhone: selectedCall.phone,
        productId,
        productName: selectedProduct.name,
        packageId,
        packageTitle: selectedPackage.title,
        packagePrice: selectedPackage.price,
        area: area as DeliveryArea,
        deliveryFee,
        totalPrice,
        deliveryDate: deliveryDate || undefined,
        status,
      }

      if (editing) {
        await updateOrder(order.id, payload)
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

      {/* Client */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
        {editing ? (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {selectedCall?.name} — {selectedCall?.phone}
          </p>
        ) : (
          <select
            value={callId}
            onChange={(e) => handleCallChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">— Select a client —</option>
            {eligibleCalls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Product */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
        <select
          value={productId}
          onChange={(e) => handleProductChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">— Select a product —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Package */}
      {selectedProduct && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package *</label>
          <div className="grid grid-cols-1 gap-2">
            {selectedProduct.packages.map((pkg) => (
              <label
                key={pkg.id}
                className={`flex items-center justify-between px-4 py-3 border rounded-lg cursor-pointer transition-colors ${packageId === pkg.id
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="package"
                    checked={packageId === pkg.id}
                    onChange={() => setPackageId(pkg.id)}
                    className="accent-green-700"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pkg.title}</p>
                    <p className="text-xs text-gray-500">{pkg.quantity} sachets</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-800">${pkg.price}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Delivery area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Area *</label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as DeliveryArea)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">— Select area —</option>
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

      {/* Delivery date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery / Collection Date</label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Status (only when editing) */}
      {editing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex gap-4">
            {(['pending', 'delivered'] as Order['status'][]).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="accent-green-700"
                />
                <span className="text-sm text-gray-700 capitalize">{s}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Order Summary */}
      {selectedPackage && area && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Order Summary</p>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-medium text-gray-900">{selectedPackage.title}</span>
              <span className="font-semibold text-green-800">${selectedPackage.price}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 italic pb-1">
              <span>(Actual business revenue)</span>
            </div>
            <div className="flex justify-between border-t border-green-100 pt-2">
              <span>Delivery Fee ({DELIVERY_AREA_LABELS[area as DeliveryArea]})</span>
              <span className="font-medium">${deliveryFee}</span>
            </div>
            <div className="text-[10px] text-gray-400 -mt-1 mb-1">
              * Goes directly to delivery person
            </div>
            <div className="flex justify-between font-bold text-lg text-green-900 border-t-2 border-green-200 pt-2 mt-2">
              <span>Customer Pays</span>
              <span>${totalPrice}</span>
            </div>
          </div>
        </div>
      )}

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
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? <><Spinner size={15} className="inline mr-1" />Saving…</> : editing ? 'Update Order' : 'Place Order'}
        </button>
      </div>
    </form>
  )
}
