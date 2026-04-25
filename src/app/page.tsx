"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"

export default function Dashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(0);

  // New Item Form State
  const [newItem, setNewItem] = useState({ name: '', company: '', category: '', price: '', stock: '' });

  const fetchLiveDB = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const db = await res.json();
        
        // Check for new orders to trigger bell notification
        setOrders((prevOrders) => {
          if (prevOrders.length > 0 && db.orders.length > prevOrders.length) {
            setNotifications(n => n + (db.orders.length - prevOrders.length));
          }
          return db.orders;
        });

        setUsers(db.users);
        setInventory(db.products);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveDB();
    const interval = setInterval(fetchLiveDB, 2000);
    return () => clearInterval(interval);
  }, []);

  const syncRawDB = async (newDbState: any) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'raw_override', db: newDbState })
    });
  };

  const handleApproveUser = (phone: string) => {
    const updatedUsers = users.map(u => u.phone === phone ? { ...u, is_approved: true } : u);
    setUsers(updatedUsers);
    syncRawDB({ users: updatedUsers, products: inventory, orders });
  };

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    // Optimistic UI Update
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    
    // Push precise update to DB
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: 'orders', item: { id, status: newStatus }, action: 'update_status' })
    });
  };

  const handleDeleteProduct = (id: number) => {
    const newInventory = inventory.filter(p => p.id !== id);
    setInventory(newInventory);
    syncRawDB({ users, products: newInventory, orders });
  };

  const handleUpdateStock = async (id: number, change: number) => {
    // Optimistic UI updates
    setInventory(inventory.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + change) } : p));
    
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_stock', productId: id, changeAmount: change })
    });
  };

  const handleAddNewProduct = async () => {
    if (!newItem.name || !newItem.price) return;

    const formattedItem = {
      name: newItem.name,
      company: newItem.company || 'Unknown',
      category: newItem.category || 'General',
      price: Number(newItem.price),
      stock: Number(newItem.stock) || 0
    };

    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_product', item: formattedItem })
    });

    // Reset Form
    setNewItem({ name: '', company: '', category: '', price: '', stock: '' });
  };

  // Helper for status badge styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Placed': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Accepted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Processing': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Shipped': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">UPKEM LABS <span className="text-emerald-600 font-light text-2xl">| Command Center</span></h1>
            <p className="text-slate-500 mt-1 font-medium">We build trust not medicine. Manage B2B users, credit lines, and incoming wholesale orders.</p>
          </div>
          <div className="relative cursor-pointer" onClick={() => setNotifications(0)}>
            <div className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition">
              <Bell className="w-6 h-6 text-slate-700" />
            </div>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {notifications}
              </span>
            )}
          </div>
        </div>

        {/* --- Top Metrics Summary Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-slate-200 shadow-md bg-white border border-l-4 border-l-emerald-500 rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 font-medium">Total Retailers</CardDescription>
              <CardTitle className="text-3xl text-slate-800">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-md bg-white border border-l-4 border-l-blue-500 rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 font-medium">Catalog Items</CardDescription>
              <CardTitle className="text-3xl text-slate-800">{inventory.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-md bg-white border border-l-4 border-l-purple-500 rounded-xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-500 font-medium">Total Orders Processed</CardDescription>
              <CardTitle className="text-3xl text-slate-800">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8 bg-slate-200/50 p-1.5 rounded-xl shadow-inner">
            <TabsTrigger value="orders" className="data-[state=active]:bg-white rounded-lg shadow-sm font-medium py-2">📦 Live Orders</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white rounded-lg shadow-sm font-medium py-2">👥 Users & Credit</TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-white rounded-lg shadow-sm font-medium py-2">💊 Inventory</TabsTrigger>
          </TabsList>
          
          {/* ORDERS TAB */}
          <TabsContent value="orders">
            <Card className="border-slate-200 shadow-lg bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl text-slate-800">Order Management Hub</CardTitle>
                <CardDescription className="text-slate-500">
                  Accept incoming orders and progress them through delivery. 
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50/50">
                      <TableHead className="text-slate-600 font-semibold">Order ID</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Customer</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Date</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Order Contents</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Total</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-center">Status</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      // Phase 17: Backorder Calculation
                      let isOverStock = false;
                      if (o.status === "Placed" && Array.isArray(o.items)) {
                         isOverStock = o.items.some((orderItem: any) => {
                            const dbItem = inventory.find((p: any) => p.id === orderItem.id);
                            return dbItem && orderItem.quantity > dbItem.stock;
                         });
                      }

                      return (
                      <TableRow key={o.id} className={`border-slate-200 hover:bg-slate-50/50 ${o.status === 'Placed' ? 'bg-amber-50/40' : ''}`}>
                        <TableCell className="font-medium text-slate-900">
                          {o.id}
                          {isOverStock && <span className="block text-xs text-red-500 font-bold mt-1">⚠️ Exceeds Stock</span>}
                        </TableCell>
                        <TableCell className="text-slate-600">{o.store}</TableCell>
                        <TableCell className="text-slate-500">{o.date}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {o.items?.map((item: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="bg-white border-slate-200 text-slate-700 shadow-sm text-[11px] px-2 py-0.5">
                                {item.name} <span className="text-emerald-600 ml-1 font-bold">x{item.quantity}</span>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          ₹{o.total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getStatusColor(o.status)}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {o.status === "Placed" && (
                              <>
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Accepted')} className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm">Accept</Button>
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Rejected')} className="bg-red-500 hover:bg-red-600 text-white shadow-sm">Reject</Button>
                              </>
                            )}
                            {o.status === "Accepted" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Processing')} className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm">Process</Button>
                            )}
                            {o.status === "Processing" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Shipped')} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">Mark Shipped</Button>
                            )}
                            {o.status === "Shipped" && (
                              <Button size="sm" variant="ghost" disabled>Completed</Button>
                            )}
                            {o.status === "Rejected" && (
                              <Button size="sm" variant="ghost" className="text-red-400" disabled>Rejected / Refunded</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="border-slate-200 shadow-lg bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-xl text-slate-800">User Management</CardTitle>
                <CardDescription className="text-slate-500">
                  Review registrations, approve accounts, and adjust credit balances.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50/50">
                      <TableHead className="text-slate-600 font-semibold">Store Name</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Phone</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Credit Balance</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Invoiced Due</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const shippedDebt = orders
                        .filter(o => o.store === user.store_name && o.status === 'Shipped')
                        .reduce((acc, order) => acc + order.total, 0);

                      return (
                      <TableRow key={user.phone} className="border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{user.store_name}</TableCell>
                        <TableCell className="text-slate-600">{user.phone}</TableCell>
                        <TableCell>
                          {user.is_approved ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          ₹{user.credit_balance.toLocaleString('en-IN')} / ₹{user.credit_limit.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-500">
                          ₹{shippedDebt.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!user.is_approved && (
                              <Button size="sm" onClick={() => handleApproveUser(user.phone)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium">
                                Approve
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="border-slate-200 text-slate-600">
                              Adjust Credit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* INVENTORY TAB */}
          <TabsContent value="inventory">
            <Card className="border-slate-200 shadow-lg bg-white rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
                <div>
                  <CardTitle className="text-xl text-slate-800">Product Inventory</CardTitle>
                  <CardDescription className="text-slate-500">
                    Manage medical supplies, view stock levels and pricing.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="bg-slate-50/30 pt-6">
                
                {/* Add New Product Form */}
                <div className="mb-8 p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full relative">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Product Name</label>
                    <input type="text" placeholder="e.g. Paracetamol 500mg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full text-sm p-2 border rounded-md" />
                  </div>
                  <div className="flex-1 w-full relative">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Company</label>
                    <input type="text" placeholder="e.g. GSK" value={newItem.company} onChange={e => setNewItem({...newItem, company: e.target.value})} className="w-full text-sm p-2 border rounded-md" />
                  </div>
                  <div className="w-full md:w-32 relative">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Price (₹)</label>
                    <input type="number" placeholder="100" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full text-sm p-2 border rounded-md" />
                  </div>
                  <div className="w-full md:w-32 relative">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Initial Stock</label>
                    <input type="number" placeholder="50" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-full text-sm p-2 border rounded-md" />
                  </div>
                  <Button onClick={handleAddNewProduct} className="bg-emerald-600 text-white hover:bg-emerald-700 w-full md:w-auto h-[38px]">+ Add Item</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50/50">
                      <TableHead className="text-slate-600 font-semibold">Name</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Category</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Price</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Stock</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((product) => (
                      <TableRow key={product.id} className="border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{product.name} <span className="text-xs text-slate-400 block">{product.company}</span></TableCell>
                        <TableCell className="text-slate-600"><Badge variant="secondary">{product.category}</Badge></TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          ₹{product.price.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleUpdateStock(product.id, -1)}>-</Button>
                            <Badge variant="outline" className={
                              product.stock > 10 
                                ? "bg-slate-100 text-slate-700 border-slate-200" 
                                : "bg-red-50 text-red-700 border-red-200"
                            }>
                              {product.stock} units
                            </Badge>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleUpdateStock(product.id, 1)}>+</Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 ml-2 text-emerald-600 border-emerald-200" onClick={() => handleUpdateStock(product.id, 10)}>+10</Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button size="sm" variant="outline" onClick={() => handleDeleteProduct(product.id)} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">❌</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
