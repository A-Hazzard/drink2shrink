'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, ShoppingCart, Archive, RotateCcw, Trash2, RefreshCcw } from 'lucide-react'
import { subscribeOrders, subscribeCalls, subscribeProducts, updateOrder, archiveOrder, restoreOrder, deleteOrder, updateCall } from '@/lib/firestore'
import type { Order, Call, Product } from '@/types'
import { DELIVERY_AREA_LABELS } from '@/types'
import Modal from '@/components/Modal'
import OrderForm from '@/components/orders/OrderForm'
import Badge from '@/components/Badge'
import TableSkeleton from '@/components/skeletons/TableSkeleton'

function fmt(ts?: { seconds: number }) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-TT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Order | undefined>()
  const [showArchived, setShowArchived] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    let done = false
    const clear = () => { if (!done) { done = true; setLoading(false) } }
    const u1 = subscribeOrders((d) => { setOrders(d); clear() }, showArchived)
    const u2 = subscribeCalls((d) => { setCalls(d); clear() })
    const u3 = subscribeProducts((d) => { setProducts(d); clear() })
    return () => { u1(); u2(); u3() }
  }, [showArchived, refreshKey])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(o: Order) {
    setEditing(o)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  async function toggleStatus(order: Order) {
    const next = order.status === 'pending' ? 'delivered' : 'pending'
    await updateOrder(order.id, { status: next })

    // Sync call outcome
    if (order.callId) {
      await updateCall(order.callId, {
        outcome: next === 'delivered' ? 'sale' : 'out_for_delivery'
      })
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this order?')) return
    await archiveOrder(id)
  }

  async function handleRestore(id: string) {
    await restoreOrder(id)
  }

  async function handleDelete(order: Order) {
    if (!confirm('PERMANENTLY DELETE this order? This cannot be undone.')) return
    await deleteOrder(order.id)

    // Unlink from call and reset outcome
    if (order.callId) {
      await updateCall(order.callId, {
        orderId: undefined, // Will be cleaned by cleanData
        outcome: 'pending'
      })
    }
  }

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.packagePrice ?? 0), 0)

  if (loading) return <TableSkeleton cols={8} rows={5} />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} orders · Revenue (packages):{' '}
            <span className="text-green-700 font-semibold">${totalRevenue.toLocaleString()} TTD</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Refresh data"
          >
            <RefreshCcw size={18} className={loading && refreshKey > 0 ? 'animate-spin' : ''} />
          </button>
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
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Place Order
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 flex flex-col items-center gap-3">
          <ShoppingCart size={40} className="text-gray-300" />
          <p className="text-gray-500 font-medium">{showArchived ? 'No archived orders' : 'No orders yet'}</p>
          {!showArchived && (
            calls.length > 0 && products.length > 0 ? (
              <button
                onClick={openAdd}
                className="text-sm text-orange-500 font-medium hover:underline"
              >
                Place your first order
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Add products and log calls first to place an order.
              </p>
            )
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Product</th>
                  <th className="px-4 py-3 hidden md:table-cell">Package</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Area</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{order.clientName}</p>
                      <p className="text-xs text-gray-400">{order.clientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {order.productName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {order.packageTitle}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell text-xs">
                      {DELIVERY_AREA_LABELS[order.area]}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-green-700">${order.packagePrice}</p>
                      {order.deliveryFee > 0 && (
                        <p className="text-xs text-gray-400">+${order.deliveryFee} delivery</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(order)}
                        title="Click to toggle status"
                      >
                        <Badge
                          variant={order.status === 'delivered' ? 'delivered' : 'pending'}
                          label={order.status === 'delivered' ? 'Delivered' : 'Pending'}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString('en-TT', { day: 'numeric', month: 'short' })
                        : fmt(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!showArchived ? (
                          <>
                            <button
                              onClick={() => openEdit(order)}
                              className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleArchive(order.id)}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(order)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(order.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(order)}
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

      {showForm && (
        <Modal
          title={editing ? 'Edit Order' : 'Place New Order'}
          onClose={closeForm}
          wide
        >
          <OrderForm
            calls={calls}
            products={products}
            order={editing}
            onDone={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
