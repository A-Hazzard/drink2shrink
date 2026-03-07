'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, Archive, RotateCcw, RefreshCcw } from 'lucide-react'
import { subscribeProducts, deleteProduct, archiveProduct, restoreProduct } from '@/lib/firestore'
import type { Product } from '@/types'
import Modal from '@/components/Modal'
import ProductForm from '@/components/products/ProductForm'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    return subscribeProducts((data) => {
      setProducts(data)
      setLoading(false)
    }, showArchived)
  }, [showArchived, refreshKey])

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => setRefreshKey(prev => prev + 1), 500)
  }

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  async function handleDelete(id: string) {
    if (!confirm('PERMANENTLY DELETE this product? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteProduct(id)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this product?')) return
    await archiveProduct(id)
  }

  async function handleRestore(id: string) {
    await restoreProduct(id)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your product catalogue</p>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="w-full h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-200 rounded-lg w-full" />
                <div className="space-y-1.5">
                  <div className="h-7 bg-gray-200 rounded w-full" />
                  <div className="h-7 bg-gray-200 rounded w-full" />
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                  <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 flex flex-col items-center gap-3">
          <Package size={40} className="text-gray-300" />
          <p className="text-gray-500 font-medium">{showArchived ? 'No archived products' : 'No products yet'}</p>
          {!showArchived && (
            <button
              onClick={openAdd}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              Add your first product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.name}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-44 bg-green-50 flex items-center justify-center">
                  <Package size={40} className="text-green-200" />
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                )}

                <div className="space-y-1 mb-4">
                  {product.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1.5"
                    >
                      <span className="text-gray-700 font-medium">{pkg.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{pkg.quantity} sachets</span>
                        <span className="text-green-700 font-semibold">${pkg.price}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {!showArchived ? (
                    <>
                      <button
                        onClick={() => openEdit(product)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(product.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Archive size={13} />
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {deletingId === product.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(product.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <RotateCcw size={13} />
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {deletingId === product.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? 'Edit Product' : 'Add Product'}
          onClose={closeForm}
          wide
        >
          <ProductForm product={editing} onDone={closeForm} />
        </Modal>
      )}
    </div>
  )
}
