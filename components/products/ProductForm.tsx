'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Product, Package } from '@/types'
import { addProduct, updateProduct } from '@/lib/firestore'
import { useToast } from '@/contexts/ToastContext'
import Spinner from '@/components/Spinner'

interface Props {
  product?: Product
  onDone: () => void
}

function emptyPackage(): Package {
  return { id: crypto.randomUUID(), title: '', price: 0, quantity: 1 }
}

export default function ProductForm({ product, onDone }: Props) {
  const editing = !!product
  const { toast } = useToast()
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(product?.thumbnailUrl ?? '')
  const [packages, setPackages] = useState<Package[]>(
    product?.packages?.length ? product.packages : [emptyPackage()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updatePkg(id: string, field: keyof Package, value: string | number) {
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  function addPackage() {
    if (packages.length >= 5) return
    setPackages((prev) => [...prev, emptyPackage()])
  }

  function removePackage(id: string) {
    if (packages.length <= 1) return
    setPackages((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Product name is required.')
    if (packages.some((p) => !p.title.trim())) return setError('All package titles are required.')
    if (packages.some((p) => p.price <= 0)) return setError('All package prices must be greater than 0.')

    setSaving(true)
    try {
      const payload = { name: name.trim(), description: description.trim(), thumbnailUrl: thumbnailUrl.trim(), packages }
      if (editing) {
        await updateProduct(product.id, payload)
        toast('Product updated!')
      } else {
        await addProduct(payload)
        toast('Product added!')
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. Drink2Shrink Instant Tea"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder="Short product description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image URL</label>
        <input
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="https://..."
        />
      </div>

      {/* Packages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Packages * <span className="text-gray-400 font-normal">(1–5)</span>
          </label>
          {packages.length < 5 && (
            <button
              type="button"
              onClick={addPackage}
              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
            >
              <Plus size={14} /> Add Package
            </button>
          )}
        </div>

        <div className="space-y-3">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Package {idx + 1}
                </span>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(pkg.id)}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Remove package"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs text-gray-600 mb-1">Title *</label>
                  <input
                    type="text"
                    value={pkg.title}
                    onChange={(e) => updatePkg(pkg.id, 'title', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="1 Week Supply"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Price (TTD) *</label>
                  <input
                    type="number"
                    min={1}
                    value={pkg.price || ''}
                    onChange={(e) => updatePkg(pkg.id, 'price', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Qty (sachets)</label>
                  <input
                    type="number"
                    min={1}
                    value={pkg.quantity || ''}
                    onChange={(e) => updatePkg(pkg.id, 'quantity', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
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
          {saving ? <><Spinner size={15} className="inline mr-1" />Saving…</> : editing ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  )
}
