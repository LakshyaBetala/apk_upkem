"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Package, Users, Activity, CheckCircle2, AlertCircle, Plus, Search, Layers, RefreshCcw, LogOut, Upload, FileSpreadsheet, Loader2, BarChart, Tag, Calendar, Percent, Trash2, ToggleLeft, ToggleRight, Gift, Copy } from "lucide-react"

// Recharts for Analytics
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [uploadingUsers, setUploadingUsers] = useState(false);
  const [uploadingProducts, setUploadingProducts] = useState(false);
  
  const userFileInput = useRef<HTMLInputElement>(null);
  const productFileInput = useRef<HTMLInputElement>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bodySystemFilter, setBodySystemFilter] = useState('');

  // New Item Form State
  const [newItem, setNewItem] = useState({ name: '', company: '', category: '', body_system: '', price: '', stock: '' });

  // Schemes Form State
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [schemeForm, setSchemeForm] = useState({
    title: '', description: '', code: '', scheme_type: 'Discount',
    discount_percent: '', flat_discount: '', min_order_value: '',
    max_discount: '', start_date: '', end_date: '', usage_limit: '', per_user_limit: '1'
  });
  const [savingScheme, setSavingScheme] = useState(false);

  const fetchLiveDB = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const db = await res.json();
        
        setOrders((prevOrders) => {
          if (prevOrders.length > 0 && db.orders.length > prevOrders.length) {
            setNotifications(n => n + (db.orders.length - prevOrders.length));
          }
          return db.orders;
        });

        setUsers(db.users);
        setInventory(db.products);
        if (db.schemes) setSchemes(db.schemes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveDB();
    const interval = setInterval(fetchLiveDB, 5000); // Polling every 5s instead of 2s to be gentler on SQLite
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const handleApproveUser = async (phone: string) => {
    const updatedUsers = users.map(u => u.phone === phone ? { ...u, is_approved: true } : u);
    setUsers(updatedUsers);
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'raw_override', db: { users: updatedUsers } })
    });
  };

  const handleUpdateOrderStatus = async (id: string, newStatus: string) => {
    let logistics = { courier_name: '', tracking_id: '' };
    
    if (newStatus === 'Shipped') {
      const courier = window.prompt("Enter Courier Name (e.g. BlueDart):");
      if (courier === null) return; // User cancelled
      const tracking = window.prompt("Enter Tracking ID:");
      if (tracking === null) return; // User cancelled
      logistics.courier_name = courier;
      logistics.tracking_id = tracking;
    }

    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus, ...logistics } : o));
    
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        collection: 'orders', 
        item: { id, status: newStatus, ...logistics }, 
        action: 'update_status' 
      })
    });
    fetchLiveDB(); // Refresh immediately
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
      ...newItem,
      company: newItem.company || 'Unknown',
      category: newItem.category || 'General',
      body_system: newItem.body_system || 'General',
      price: Number(newItem.price),
      stock: Number(newItem.stock) || 0
    };
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_product', item: formattedItem })
    });
    setNewItem({ name: '', company: '', category: '', body_system: '', price: '', stock: '' });
    fetchLiveDB();
  };

  const handleCreateScheme = async () => {
    if (!schemeForm.title || !schemeForm.code || !schemeForm.start_date || !schemeForm.end_date) {
      alert('Title, Code, Start Date, and End Date are required');
      return;
    }
    setSavingScheme(true);
    try {
      const res = await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schemeForm,
          discount_percent: schemeForm.discount_percent ? Number(schemeForm.discount_percent) : null,
          flat_discount: schemeForm.flat_discount ? Number(schemeForm.flat_discount) : null,
          min_order_value: schemeForm.min_order_value ? Number(schemeForm.min_order_value) : 0,
          max_discount: schemeForm.max_discount ? Number(schemeForm.max_discount) : null,
          usage_limit: schemeForm.usage_limit ? Number(schemeForm.usage_limit) : 0,
          per_user_limit: schemeForm.per_user_limit ? Number(schemeForm.per_user_limit) : 1,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSchemeForm({ title: '', description: '', code: '', scheme_type: 'Discount', discount_percent: '', flat_discount: '', min_order_value: '', max_discount: '', start_date: '', end_date: '', usage_limit: '', per_user_limit: '1' });
        setShowSchemeForm(false);
        fetchLiveDB();
      } else {
        alert(data.error || 'Failed to create scheme');
      }
    } catch { alert('Network error'); }
    setSavingScheme(false);
  };

  const handleToggleScheme = async (id: number) => {
    await fetch('/api/schemes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle' })
    });
    fetchLiveDB();
  };

  const handleDeleteScheme = async (id: number) => {
    if (!window.confirm('Delete this scheme permanently?')) return;
    await fetch(`/api/schemes?id=${id}`, { method: 'DELETE' });
    fetchLiveDB();
  };

  const getSchemeStatus = (scheme: any) => {
    const today = new Date().toISOString().split('T')[0];
    if (!scheme.is_active) return 'Disabled';
    if (scheme.start_date > today) return 'Scheduled';
    if (scheme.end_date < today) return 'Expired';
    return 'Active';
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'users' | 'products') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'users') setUploadingUsers(true);
    else setUploadingProducts(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully imported ${data.added} ${type}.`);
        fetchLiveDB();
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (err) {
      alert('An error occurred during upload.');
    } finally {
      if (type === 'users') setUploadingUsers(false);
      else setUploadingProducts(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Placed': return <Badge className="bg-amber-100/50 text-amber-700 hover:bg-amber-100 border border-amber-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><Activity className="w-3 h-3 mr-1.5" /> Placed</Badge>;
      case 'Accepted': return <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1.5" /> Accepted</Badge>;
      case 'Processing': return <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><RefreshCcw className="w-3 h-3 mr-1.5 animate-spin-slow" /> Processing</Badge>;
      case 'Shipped': return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 shadow-none font-semibold px-3 py-0.5 rounded-full"><Package className="w-3 h-3 mr-1.5" /> Shipped</Badge>;
      default: return <Badge variant="outline" className="text-slate-500">{status}</Badge>;
    }
  };

  const isNearingCreditDeadline = (dateStr: string) => {
    // Assuming format DD/MM/YYYY
    const [day, month, year] = dateStr.split('/');
    const orderDate = new Date(`${year}-${month}-${day}`);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 55 && diffDays <= 60;
  };

  const isPastCreditDeadline = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    const orderDate = new Date(`${year}-${month}-${day}`);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 60;
  };

  const filteredInventory = inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter ? p.category === categoryFilter : true;
    const matchesSystem = bodySystemFilter ? p.body_system === bodySystemFilter : true;
    return matchesSearch && matchesCat && matchesSystem;
  });

  const uniqueCategories = Array.from(new Set(inventory.map(p => p.category))).filter(Boolean);
  const uniqueSystems = Array.from(new Set(inventory.map(p => p.body_system))).filter(Boolean);

  // Analytics Processing
  const revenueByDate = orders.filter(o => o.status !== 'Rejected').reduce((acc: any, order: any) => {
    const date = order.date; // assuming string
    if (!acc[date]) acc[date] = 0;
    acc[date] += order.total;
    return acc;
  }, {} as any);
  
  const revenueData = Object.keys(revenueByDate).slice(-7).map(date => ({
    date,
    revenue: revenueByDate[date]
  }));

  const skuVolume = orders.filter(o => o.status !== 'Rejected').reduce((acc: any, order: any) => {
    if(order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        if (!acc[item.name]) acc[item.name] = 0;
        acc[item.name] += item.quantity;
      });
    }
    return acc;
  }, {} as any);

  const topSKUs = Object.keys(skuVolume)
    .map(name => ({ name: name.substring(0, 15) + '...', volume: skuVolume[name] }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F0F5F3] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <header className="upkem-header-gradient text-white border-b border-emerald-900/50 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Layers className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                UPKEM LABS
                <span className="text-slate-500 font-medium text-lg">/</span>
                <span className="text-emerald-400 font-medium tracking-normal text-sm uppercase tracking-widest mt-0.5">Command Center</span>
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
              <div className="p-2.5 bg-white/10 rounded-full group-hover:bg-white/15 transition-colors border border-white/10">
                <Bell className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              {notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-bold text-emerald-950 shadow-lg shadow-emerald-500/30 border-2 border-emerald-900">
                  {notifications}
                </span>
              )}
            </div>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <Button variant="ghost" onClick={handleLogout} className="text-emerald-200 hover:text-white hover:bg-white/10 gap-2 h-10 px-3 rounded-lg">
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(27,67,50,0.12)] rounded-2xl overflow-hidden group">
            <div className="h-1.5 w-full bg-emerald-700"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Retail Partners</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">{users.length}</h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(27,67,50,0.12)] rounded-2xl overflow-hidden group">
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
          
          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(27,67,50,0.12)] rounded-2xl overflow-hidden group">
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
            <TabsList className="h-14 bg-white border border-slate-200/60 p-1.5 rounded-2xl shadow-sm inline-flex overflow-x-auto max-w-full">
              <TabsTrigger value="orders" className="data-[state=active]:bg-emerald-800 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Live Orders</TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-emerald-800 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Credit & Partners</TabsTrigger>
              <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-800 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all">Inventory Control</TabsTrigger>
              <TabsTrigger value="schemes" className="data-[state=active]:bg-emerald-800 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all flex items-center gap-2"><Tag className="w-4 h-4" /> Schemes & Offers</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-800 data-[state=active]:text-white rounded-xl px-6 font-semibold text-sm transition-all flex items-center gap-2"><BarChart className="w-4 h-4" /> Analytics</TabsTrigger>
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
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-center">Status / Logistics</TableHead>
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

                      const nearingDeadline = isNearingCreditDeadline(o.date) && o.status === 'Shipped';
                      const pastDeadline = isPastCreditDeadline(o.date) && o.status === 'Shipped';

                      return (
                      <TableRow key={o.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${o.status === 'Placed' ? 'bg-amber-50/20' : ''} ${pastDeadline ? 'bg-red-50/30' : ''}`}>
                        <TableCell className="font-bold text-slate-900 py-5 pl-8 font-mono text-sm">
                          {o.id}
                          {isOverStock && <span className="flex items-center gap-1 text-[10px] text-red-600 uppercase tracking-wider font-bold mt-1.5"><AlertCircle className="w-3 h-3"/> Exceeds Stock</span>}
                          {nearingDeadline && <span className="flex items-center gap-1 text-[10px] text-amber-600 uppercase tracking-wider font-bold mt-1.5"><Bell className="w-3 h-3"/> 55+ Days Due</span>}
                          {pastDeadline && <span className="flex items-center gap-1 text-[10px] text-red-600 uppercase tracking-wider font-bold mt-1.5"><AlertCircle className="w-3 h-3"/> Past 60 Days</span>}
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-semibold text-slate-800">{o.store_name}</span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm font-medium py-5">{o.date}</TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="bg-slate-100 border border-slate-200/60 rounded-md px-2 py-1 text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                                {item.name} <span className="bg-white px-1.5 py-0.5 rounded text-emerald-800 font-bold shadow-sm">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 py-5 tabular-nums text-base tracking-tight">
                          ₹{o.total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center py-5">
                          {getStatusBadge(o.status)}
                          {o.status === 'Shipped' && o.courier_name && (
                            <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-2 py-1">
                              {o.courier_name}: {o.tracking_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-5 pr-8">
                          <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                            {o.status === "Placed" && (
                              <>
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'Accepted')} className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-200 font-semibold h-9 px-4 rounded-xl transition-all hover:scale-105 active:scale-95">Accept</Button>
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
              <div className="p-6 md:p-8 border-b border-slate-100 bg-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Partner & Credit Directory</h2>
                  <p className="text-slate-500 mt-1 font-medium">Manage B2B relationships, approve access, and monitor credit lines.</p>
                </div>
                <div className="flex gap-3">
                  <input type="file" accept=".xlsx, .xls" className="hidden" ref={userFileInput} onChange={(e) => handleFileUpload(e, 'users')} />
                  <Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => window.open('/templates/Users_Upload_Template.xlsx', '_blank')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                  <Button className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-200" onClick={() => userFileInput.current?.click()} disabled={uploadingUsers}>
                    {uploadingUsers ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Bulk Upload Clients
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pl-8">Store Name</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Contact</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Zone / District</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Account Status</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Credit Utilized</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-right">Invoiced Due</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    if (user.role === 'admin') return null;
                    const shippedDebt = orders
                      .filter(o => o.store_name === user.store_name && o.status === 'Shipped')
                      .reduce((acc, order) => acc + order.total, 0);

                    const creditPercentage = user.credit_limit > 0 ? (user.credit_balance / user.credit_limit) * 100 : 0;

                    return (
                    <TableRow key={user.phone} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-5 pl-8">
                        <span className="font-bold text-slate-900 text-base">{user.store_name}</span>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium py-5 font-mono text-sm">{user.phone}</TableCell>
                      <TableCell className="py-5">
                        {user.city ? (
                          <span className="text-sm font-semibold text-slate-700">{user.city}{user.zone ? <span className="text-slate-400 font-normal">, {user.zone}</span> : ''}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not set</span>
                        )}
                      </TableCell>
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
                            <div className={`h-full rounded-full ${creditPercentage > 90 ? 'bg-red-500' : 'bg-emerald-600'}`} style={{ width: `${Math.min(creditPercentage, 100)}%` }}></div>
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
                <div className="flex gap-3">
                  <input type="file" accept=".xlsx, .xls" className="hidden" ref={productFileInput} onChange={(e) => handleFileUpload(e, 'products')} />
                  <Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => window.open('/templates/Products_Upload_Template.xlsx', '_blank')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200" onClick={() => productFileInput.current?.click()} disabled={uploadingProducts}>
                    {uploadingProducts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Bulk Upload Excel
                  </Button>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 mb-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-700"/> Add New SKU
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Product Name</label>
                      <input type="text" placeholder="e.g. Paracetamol 500mg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Manufacturer</label>
                      <input type="text" placeholder="e.g. GSK" value={newItem.company} onChange={e => setNewItem({...newItem, company: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Category / Body</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Category" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-1/2 text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                        <input type="text" placeholder="System" value={newItem.body_system} onChange={e => setNewItem({...newItem, body_system: e.target.value})} className="w-1/2 text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Price / Stock</label>
                      <div className="flex gap-2">
                        <input type="number" placeholder="₹" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-1/2 text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                        <input type="number" placeholder="Qty" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} className="w-1/2 text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all" />
                      </div>
                    </div>
                    <Button onClick={handleAddNewProduct} className="bg-slate-900 hover:bg-emerald-700 text-white font-bold h-[46px] rounded-xl shadow-md transition-all w-full">Create</Button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search by name or company..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-shadow shadow-sm" />
                  </div>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm md:w-48">
                    <option value="">All Categories</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={bodySystemFilter} onChange={e => setBodySystemFilter(e.target.value)} className="py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm md:w-48">
                    <option value="">All Body Systems</option>
                    {uniqueSystems.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  {filteredInventory.map((product) => (
                    <TableRow key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-4 pl-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-base tracking-tight">{product.name}</span>
                          <span className="text-xs font-semibold text-emerald-700">{product.company} &bull; <span className="text-slate-400">{product.category} {product.body_system !== 'General' && `(${product.body_system})`}</span></span>
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
                         <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                           <AlertCircle className="w-4 h-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Analytics</h2>
                <p className="text-slate-500 mt-1 font-medium">Business intelligence and performance metrics.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-700"/> Revenue Trend (Last 7 Active Days)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} width={60} />
                        <RechartsTooltip formatter={(value) => [`₹${value}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}/>
                        <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-500"/> Top 5 SKUs (By Volume)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={topSKUs} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#475569'}} axisLine={false} tickLine={false} width={100} />
                        <RechartsTooltip formatter={(value) => [value, 'Units Sold']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}/>
                        <Bar dataKey="volume" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* SCHEMES & OFFERS TAB */}
          <TabsContent value="schemes" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Schemes & Offers</h2>
                  <p className="text-slate-500 mt-1 font-medium">Create and manage coupon codes for your B2B customers.</p>
                </div>
                <Button onClick={() => setShowSchemeForm(!showSchemeForm)} className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-200 font-semibold rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> {showSchemeForm ? 'Cancel' : 'Create Coupon'}
                </Button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 md:px-8 md:pt-6 md:pb-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl"><Tag className="w-5 h-5 text-emerald-700" /></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-black text-emerald-800 tabular-nums">{schemes.filter(s => getSchemeStatus(s) === 'Active').length}</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl"><Calendar className="w-5 h-5 text-amber-700" /></div>
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Scheduled</p>
                    <p className="text-2xl font-black text-amber-800 tabular-nums">{schemes.filter(s => getSchemeStatus(s) === 'Scheduled').length}</p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl"><Gift className="w-5 h-5 text-slate-600" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Coupons</p>
                    <p className="text-2xl font-black text-slate-800 tabular-nums">{schemes.length}</p>
                  </div>
                </div>
              </div>

              {/* Create Scheme Form */}
              {showSchemeForm && (
                <div className="p-6 md:px-8 bg-emerald-50/40 border-b border-emerald-100">
                  <div className="bg-white p-6 rounded-2xl border border-emerald-200/50 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-700" /> New Coupon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Coupon Title</label>
                        <input type="text" placeholder="e.g. Summer Sale" value={schemeForm.title} onChange={e => setSchemeForm({...schemeForm, title: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Coupon Code</label>
                        <input type="text" placeholder="e.g. SAVE20" value={schemeForm.code} onChange={e => setSchemeForm({...schemeForm, code: e.target.value.toUpperCase()})} className="w-full text-sm font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono tracking-widest" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Type</label>
                        <select value={schemeForm.scheme_type} onChange={e => setSchemeForm({...schemeForm, scheme_type: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                          <option value="Discount">Discount %</option>
                          <option value="Flat">Flat ₹ Off</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      {schemeForm.scheme_type === 'Discount' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Discount %</label>
                          <input type="number" placeholder="e.g. 15" value={schemeForm.discount_percent} onChange={e => setSchemeForm({...schemeForm, discount_percent: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                        </div>
                      )}
                      {schemeForm.scheme_type === 'Flat' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Flat Off (₹)</label>
                          <input type="number" placeholder="e.g. 500" value={schemeForm.flat_discount} onChange={e => setSchemeForm({...schemeForm, flat_discount: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                        </div>
                      )}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Min Order (₹)</label>
                        <input type="number" placeholder="e.g. 5000" value={schemeForm.min_order_value} onChange={e => setSchemeForm({...schemeForm, min_order_value: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Max Discount (₹)</label>
                        <input type="number" placeholder="Optional cap" value={schemeForm.max_discount} onChange={e => setSchemeForm({...schemeForm, max_discount: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Global Limit</label>
                        <input type="number" placeholder="0 = unlimited" value={schemeForm.usage_limit} onChange={e => setSchemeForm({...schemeForm, usage_limit: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Per User Limit</label>
                        <input type="number" placeholder="0 = unlimited" value={schemeForm.per_user_limit} onChange={e => setSchemeForm({...schemeForm, per_user_limit: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                        <input type="text" placeholder="Short promo text" value={schemeForm.description} onChange={e => setSchemeForm({...schemeForm, description: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                        <input type="date" value={schemeForm.start_date} onChange={e => setSchemeForm({...schemeForm, start_date: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                        <input type="date" value={schemeForm.end_date} onChange={e => setSchemeForm({...schemeForm, end_date: e.target.value})} className="w-full text-sm font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
                      </div>
                    </div>
                    <Button onClick={handleCreateScheme} disabled={savingScheme} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md w-full md:w-auto px-8 h-11">
                      {savingScheme ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Create Coupon
                    </Button>
                  </div>
                </div>
              )}

              {/* Schemes Table */}
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pl-8">Coupon</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Code</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Type / Value</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Min Order</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Validity</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5">Limits</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 text-center">Status</TableHead>
                    <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs py-5 pr-8 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-16 text-slate-400 text-sm font-medium">No coupons created yet. Click "Create Coupon" to get started.</TableCell></TableRow>
                  )}
                  {schemes.map((scheme) => {
                    const status = getSchemeStatus(scheme);
                    return (
                      <TableRow key={scheme.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="py-5 pl-8">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{scheme.title}</span>
                            {scheme.description && <span className="text-xs text-slate-500 mt-0.5">{scheme.description}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm tracking-wider">{scheme.code}</span>
                        </TableCell>
                        <TableCell className="py-5">
                          <span className="font-bold text-slate-800">
                            {scheme.scheme_type === 'Discount' ? `${scheme.discount_percent}% off` : `₹${scheme.flat_discount} off`}
                          </span>
                          {scheme.max_discount && <span className="text-xs text-slate-400 block">Max ₹{scheme.max_discount}</span>}
                        </TableCell>
                        <TableCell className="py-5 font-semibold text-slate-700">₹{(scheme.min_order_value || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="py-5">
                          <span className="text-xs font-semibold text-slate-600">{scheme.start_date}</span>
                          <span className="text-xs text-slate-400"> → </span>
                          <span className="text-xs font-semibold text-slate-600">{scheme.end_date}</span>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-slate-500">Global: {scheme.usage_limit > 0 ? `${scheme.times_used}/${scheme.usage_limit}` : `${scheme.times_used} (Unlmt)`}</span>
                            <span className="text-xs font-medium text-emerald-700">Per User: {scheme.per_user_limit > 0 ? scheme.per_user_limit : 'Unlmt'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-5">
                          {status === 'Active' && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-none font-bold px-3 py-0.5 rounded-full">Active</Badge>}
                          {status === 'Scheduled' && <Badge className="bg-amber-50 text-amber-700 border border-amber-200 shadow-none font-bold px-3 py-0.5 rounded-full">Scheduled</Badge>}
                          {status === 'Expired' && <Badge className="bg-red-50 text-red-600 border border-red-200 shadow-none font-bold px-3 py-0.5 rounded-full">Expired</Badge>}
                          {status === 'Disabled' && <Badge className="bg-slate-100 text-slate-500 border border-slate-200 shadow-none font-bold px-3 py-0.5 rounded-full">Disabled</Badge>}
                        </TableCell>
                        <TableCell className="text-right py-5 pr-8">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleToggleScheme(scheme.id)} className="h-9 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold">
                              {scheme.is_active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteScheme(scheme.id)} className="h-9 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
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
        </Tabs>
      </main>
    </div>
  )
}
