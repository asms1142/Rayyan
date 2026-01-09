import Dexie, { Table } from "dexie";

// 1️⃣ Define database interface
export interface Order {
  id?: number;
  order_id: string;
  tenant_id: string;
  items: { product_id: number; qty: number; price: number }[];
  total_amount: number;
  status: "pending" | "synced";
  created_at: string;
  updated_at: string;
}

// 2️⃣ Extend Dexie with table types
export class POSOfflineDB extends Dexie {
  orders!: Table<Order, number>; // 'orders' table with primary key of type number

  constructor() {
    super("POSOfflineDB");
    this.version(1).stores({
      orders:
        "++id, order_id, tenant_id, items, total_amount, status, created_at, updated_at",
      // ++id → auto increment key
    });
  }
}

// 3️⃣ Create DB instance
export const db = new POSOfflineDB();

// 4️⃣ Save order offline
export const saveOrderOffline = async (
  order: Omit<Order, "id" | "status">
) => {
  const orderWithMeta: Order = {
    ...order,
    order_id: `order_${Date.now()}`, // unique ID
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.orders.add(orderWithMeta);
  return orderWithMeta;
};

// 5️⃣ Sync orders to server
export const syncOrdersToServer = async () => {
  // Get all pending orders
  const pendingOrders = await db.orders
    .where("status")
    .equals("pending")
    .toArray();

  if (pendingOrders.length === 0) return;

  try {
    const response = await fetch("/api/sync/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: pendingOrders }),
    });

    const data = await response.json();

    if (response.ok) {
      // On successful sync, mark orders as 'synced'
      for (const order of pendingOrders) {
        await db.orders.update(order.id!, {
          status: "synced",
          updated_at: new Date().toISOString(),
        });
      }
      console.log("Orders synced successfully!");
    } else {
      console.error("Sync failed:", data.message);
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
};
