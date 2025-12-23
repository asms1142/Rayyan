
import Dexie from 'dexie'

// 1. Database নাম এবং version define করা
export const db = new Dexie('POSOfflineDB')

db.version(1).stores({
  orders: '++id, order_id, tenant_id, items, total_amount, status, created_at, updated_at'
  // ++id → auto increment key
  // order_id → unique ID for server sync
})

// Example order type
export interface Order {
  id?: number
  order_id: string
  tenant_id: string
  items: { product_id: number; qty: number; price: number }[]
  total_amount: number
  status: 'pending' | 'synced'
  created_at: string
  updated_at: string
}

export const saveOrderOffline = async (order: Omit<Order, 'id' | 'status'>) => {
  const orderWithMeta: Order = {
    ...order,
    order_id: `order_${Date.now()}`, // unique ID
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await db.orders.add(orderWithMeta)
  return orderWithMeta
}

export const syncOrdersToServer = async () => {
  // Get all pending orders
  const pendingOrders = await db.orders.where('status').equals('pending').toArray()

  if (pendingOrders.length === 0) return

  try {
    const response = await fetch('/api/sync/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: pendingOrders }),
    })

    const data = await response.json()

    if (response.ok) {
      // On successful sync, mark orders as 'synced'
      for (const order of pendingOrders) {
        await db.orders.update(order.id!, { status: 'synced', updated_at: new Date().toISOString() })
      }
      console.log('Orders synced successfully!')
    } else {
      console.error('Sync failed:', data.message)
    }
  } catch (err) {
    console.error('Sync error:', err)
  }
}

