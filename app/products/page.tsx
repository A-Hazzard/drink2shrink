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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Products</h1>
          <p className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-widest text-[10px]">Manage Catalogue</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 shadow-sm active:scale-95"
            title="Refresh data"
          >
            <RefreshCcw size={20} className={loading && refreshKey > 0 ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all shadow-sm active:scale-95 ${showArchived
              ? 'bg-gray-900 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            <Archive size={18} />
            <span className="hidden xs:inline">{showArchived ? 'Active' : 'Archived'}</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white text-sm font-black rounded-xl hover:bg-green-800 transition-all shadow-lg shadow-green-100 active:scale-95 uppercase tracking-wider"
          >
            <Plus size={18} strokeWidth={3} />
            ADD PRODUCT
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-100" />
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-100 rounded-lg w-full" />
                <div className="space-y-2">
                  <div className="h-8 bg-gray-100 rounded-xl w-full" />
                  <div className="h-8 bg-gray-100 rounded-xl w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
            <Package size={40} className="text-gray-300" />
          </div>
          <div>
            <p className="text-gray-900 font-black text-lg">{showArchived ? 'No archived products' : 'Your catalogue is empty'}</p>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest text-[10px]">Ready to add your wellness line?</p>
          </div>
          {!showArchived && (
            <button
              onClick={openAdd}
              className="mt-2 px-8 py-3 bg-green-50 text-green-700 font-black rounded-xl hover:bg-green-100 transition-colors uppercase tracking-widest text-[10px]"
            >
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-100 transition-all group"
            >
              {product.thumbnailUrl ? (
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              ) : (
                <div className="w-full h-52 bg-green-50 flex items-center justify-center">
                  <Package size={50} className="text-green-200" />
                </div>
              )}

              <div className="p-6">
                <h3 className="font-black text-gray-900 text-xl tracking-tight mb-2 truncate">{product.name}</h3>
                {product.description && (
                  <p className="text-xs font-medium text-gray-500 mb-6 line-clamp-2 leading-relaxed h-8">{product.description}</p>
                )}

                <div className="space-y-2 mb-8">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Packages & Pricing</p>
                  {product.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex justify-between items-center bg-gray-50/50 rounded-xl px-4 py-3 border border-gray-50"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{pkg.title}</span>
                        <span className="text-[9px] font-bold text-gray-300">{pkg.quantity} Sachets</span>
                      </div>
                      <span className="text-sm font-black text-green-700 tracking-tighter">${pkg.price}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  {!showArchived ? (
                    <>
                      <button
                        onClick={() => openEdit(product)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-all"
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-shrink-0 flex items-center justify-center p-3 text-red-400 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={14} />
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
