import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Product, Call, Order, CallOutcome } from '@/types'

/**
 * Helper to remove undefined values before sending to Firestore
 */
function cleanData<T extends object>(data: T): T {
  const clean: Record<string, unknown> = {}
  Object.keys(data).forEach((key) => {
    const val = (data as Record<string, unknown>)[key]
    if (val !== undefined) {
      clean[key] = val
    }
  })
  return clean as T
}

// ── Products ──────────────────────────────────────────────────────────────────

export function subscribeProducts(cb: (products: Product[]) => void, showArchived = false): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
  return onSnapshot(q,
    (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      cb(all.filter(p => !!p.archivedAt === showArchived))
    },
    () => cb([])
  )
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'products'), cleanData({ ...data, createdAt: serverTimestamp() }))
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>) {
  return updateDoc(doc(db, 'products', id), cleanData(data))
}

export async function deleteProduct(id: string) {
  return deleteDoc(doc(db, 'products', id))
}

export async function archiveProduct(id: string) {
  return updateDoc(doc(db, 'products', id), { archivedAt: serverTimestamp() })
}

export async function restoreProduct(id: string) {
  return updateDoc(doc(db, 'products', id), { archivedAt: null })
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export function subscribeCalls(cb: (calls: Call[]) => void, showArchived = false): Unsubscribe {
  const q = query(collection(db, 'calls'), orderBy('createdAt', 'desc'))
  return onSnapshot(q,
    (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Call))
      cb(all.filter(c => !!c.archivedAt === showArchived))
    },
    () => cb([])
  )
}

export async function addCall(data: Omit<Call, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'calls'), cleanData({ ...data, createdAt: serverTimestamp() }))
}

export async function updateCall(id: string, data: Partial<Omit<Call, 'id'>>) {
  return updateDoc(doc(db, 'calls', id), cleanData(data))
}

export async function archiveCall(id: string) {
  return updateDoc(doc(db, 'calls', id), { archivedAt: serverTimestamp() })
}

export async function restoreCall(id: string) {
  return updateDoc(doc(db, 'calls', id), { archivedAt: null })
}

export async function deleteCall(id: string) {
  return deleteDoc(doc(db, 'calls', id))
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function subscribeOrders(cb: (orders: Order[]) => void, showArchived = false): Unsubscribe {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
  return onSnapshot(q,
    (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
      cb(all.filter(o => !!o.archivedAt === showArchived))
    },
    () => cb([])
  )
}

export async function addOrder(
  data: Omit<Order, 'id' | 'createdAt'>,
  callId: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), cleanData({
    ...data,
    createdAt: serverTimestamp(),
  }))
  // Link the order back to the call and mark outcome
  await updateDoc(doc(db, 'calls', callId), {
    orderId: ref.id,
    outcome: (data.status === 'delivered' ? 'sale' : 'out_for_delivery') as CallOutcome,
  })
  return ref.id
}

export async function updateOrder(id: string, data: Partial<Omit<Order, 'id'>>) {
  return updateDoc(doc(db, 'orders', id), cleanData(data))
}

export async function archiveOrder(id: string) {
  return updateDoc(doc(db, 'orders', id), { archivedAt: serverTimestamp() })
}

export async function restoreOrder(id: string) {
  return updateDoc(doc(db, 'orders', id), { archivedAt: null })
}

export async function deleteOrder(id: string) {
  return deleteDoc(doc(db, 'orders', id))
}
