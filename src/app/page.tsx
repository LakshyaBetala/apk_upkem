"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Package, Users, Activity, CheckCircle2, AlertCircle, Plus, Search, Layers, RefreshCcw } from "lucide-react"

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
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
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
    setNewItem({ name: '', company: '', category: '', price: '', stock: '' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Placed': return <Badge className="bg-amber-100/50 text-amber-700 hover:bg-amber-100 border border-amber-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><Activity className="w-3 h-3 mr-1.5" /> Placed</Badge>;
      case 'Accepted': return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1.5" /> Accepted</Badge>;
      case 'Processing': return <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><RefreshCcw className="w-3 h-3 mr-1.5 animate-spin-slow" /> Processing</Badge>;
      case 'Shipped': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><Package className="w-3 h-3 mr-1.5" /> Shipped</Badge>;
      default: return <Badge variant="outline" className="text-slate-500">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 
        PREMIUM HEADER
        Moving away from standard white box headers. Using a deep slate header for the "Command Center" feel,
        establishing immediate authority and enterprise trust.
      */}
      <header className="bg-slate-950 text-white border-b border-slate-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              <Layers className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                UPKEM LABS
                <span className="text-slate-500 font-medium text-lg">/</span>
                <span className="text-indigo-400 font-medium tracking-normal text-sm uppercase tracking-widest mt-0.5">Command Center</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Live
            </div>
            <div className="relative cursor-pointer group" onClick={() => setNotifications(0)}>
              <div className="p-2.5 bg-slate-800/50 rounded-full group-hover:bg-slate-800 transition-colors border border-slate-700/50">
                <Bell className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              {notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/30 border-2 border-slate-950">
                  {notifications}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-10">
        
        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden group">
            <div className="h-1.5 w-full bg-indigo-600"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Retail Partners</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">{users.length}</h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden group">
            <div className="h-1.5 w-full bg-emerald-500"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active SKUs</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">{inventory.length}</h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden group">
            <div className="h-1.5 w-full bg-slate-900"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Processed Orders</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">{orders.length}</h3>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <div className="flex justify-between items-end mb-8">
            <TabsList className="h-14 bg-white border border-slate-200/60 p-1.5 rounded-2xl shadow-sm inline-flex">
              <TabsTrigger value="orders" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Live Orders</TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Credit & Partners</TabsTrigger>
              <TabsTrigger value="inventory" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Inventory Control</TabsTrigger>
            </TabsList>
          </div>
          
          {/* ORDERS TAB */}
          <TabsContent value="orders" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
              <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Order Management</h2>
                  <p className="text-slate-500 mt-1 font-medium">Review, accept, and process incoming B2B wholesale orders.</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search orders..." className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64 transition-shadow" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pl-8">Order ID</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Partner</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Date</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 w-[300px]">Items</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Total (₹)</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-center">Status</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pr-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      let isOverStock = false;
                      if (o.status === "Placed" && Array.isArray(o.items)) {
                         isOverStock = o.items.some((orderItem: any) => {
                            const dbItem = inventory.find((p: any) => p.id === orderItem.id);
                            return dbItem && orderItem.quantity > dbItem.stock;
                         });
                      }

                      return (
                      <TableRow key={o.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${o.status === 'Placed' ? 'bg-amber-50/20' : ''}`}>
                        <TableCell className="font-bold text-slate-900 py-5 pl-8 font-mono text-sm">
                          {o.id}
                          {isOverStock && <span className="flex items-center gap-1 text-[10px] text-red-600 uppercase tracking-wider font-bold mt-1.5"><AlertCircle className="w-3 h-3"/> Exceeds Stock</span>}
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-semibold text-slate-800">{o.store}</span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm font-medium py-5">{o.date}</TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="bg-slate-100 border border-slate-200/60 rounded-md px-2 py-1 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                                {item.name} <span className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-bold shadow-sm">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 py-5 tabular-nums text-base tracking-tight">
                          ₹{o.total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center py-5">
                          {getStatusBadge(o.status)}
                        </TableCell>
                        <TableCell className="text-right py-5 pr-8">
                          <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                            {o.status === "Placed" && (
                              <>
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Accepted')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 font-semibold h-9 px-4 rounded-xl transition-all hover:scale-105 active:scale-95">Accept</Button>
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Rejected')} className="bg-white border-2 border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600 font-semibold h-9 px-4 rounded-xl transition-all">Reject</Button>
                              </>
                            )}
                            {o.status === "Accepted" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Processing')} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold h-9 px-5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95">Begin Process</Button>
                            )}
                            {o.status === "Processing" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Shipped')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-9 px-5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95">Dispatch</Button>
                            )}
                            {(o.status === "Shipped" || o.status === "Rejected") && (
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Archived</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-white">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Partner & Credit Directory</h2>
                <p className="text-slate-500 mt-1 font-medium">Manage B2B relationships, approve access, and monitor credit lines.</p>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pl-8">Store Name</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Contact</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Account Status</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Credit Utilized</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Invoiced Due</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const shippedDebt = orders
                      .filter(o => o.store === user.store_name && o.status === 'Shipped')
                      .reduce((acc, order) => acc + order.total, 0);

                    const creditPercentage = (user.credit_balance / user.credit_limit) * 100;

                    return (
                    <TableRow key={user.phone} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-5 pl-8">
                        <span className="font-bold text-slate-900 text-base">{user.store_name}</span>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium py-5 font-mono text-sm">{user.phone}</TableCell>
                      <TableCell className="py-5">
                        {user.is_approved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Approval
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-5">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-bold text-slate-900 tabular-nums">
                            ₹{user.credit_balance.toLocaleString('en-IN')} <span className="text-slate-400 font-medium text-xs">/ {user.credit_limit.toLocaleString('en-IN')}</span>
                          </span>
                          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(creditPercentage, 100)}%` }}></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-5">
                        <span className={`font-black tabular-nums ${shippedDebt > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                          ₹{shippedDebt.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-5 pr-8">
                        <div className="flex justify-end gap-3">
                          {!user.is_approved && (
                            <Button size="sm" onClick={() => handleApproveUser(user.phone)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-9 rounded-xl shadow-md transition-all">
                              Approve
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-9 rounded-xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-100">
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          
          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Master Catalog</h2>
                  <p className="text-slate-500 mt-1 font-medium">Control inventory levels, pricing, and new product listings.</p>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600"/> Add New SKU
                  </h3>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Product Name</label>
                      <input type="text" placeholder="e.g. Paracetamol 500mg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Manufacturer</label>
                      <input type="text" placeholder="e.g. GSK" value={newItem.company} onChange={e => setNewItem({...newItem, company: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Price (₹)</label>
                      <input type="number" placeholder="100" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Initial Stock</label>
                      <input type="number" placeholder="50" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" />
                    </div>
                    <Button onClick={handleAddNewProduct} className="bg-slate-900 hover:bg-indigo-600 text-white font-bold h-[46px] px-6 rounded-xl shadow-md transition-all w-full md:w-auto">Create SKU</Button>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pl-8">Item Description</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Unit Price</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Available Stock</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pr-8 text-right">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((product) => (
                    <TableRow key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-4 pl-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-base tracking-tight">{product.name}</span>
                          <span className="text-xs font-semibold text-indigo-600">{product.company} &bull; <span className="text-slate-400">{product.category}</span></span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 font-black text-slate-900 tabular-nums">
                        ₹{product.price.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-200 hover:text-slate-900" onClick={() => handleUpdateStock(product.id, -1)}>-</Button>
                          <span className={`font-mono font-bold w-12 text-center ${product.stock < 10 ? 'text-red-600 bg-red-50 rounded py-1' : 'text-slate-700'}`}>
                            {product.stock}
                          </span>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-200 hover:text-slate-900" onClick={() => handleUpdateStock(product.id, 1)}>+</Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold" onClick={() => handleUpdateStock(product.id, 10)}>+10</Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 pr-8">
                         <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                           <AlertCircle className="w-4 h-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
