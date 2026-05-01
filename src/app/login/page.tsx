"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 border border-indigo-400/30 mb-6">
            <Layers className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">UPKEM LABS</h1>
          <p className="text-slate-500 font-medium mt-2">Admin Command Center</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-2xl font-bold">Secure Login</CardTitle>
            <CardDescription className="text-slate-500 text-base">
              Enter your credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                <Input 
                  type="tel"
                  placeholder="e.g. 6383945610" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 border-slate-200 bg-slate-50/50 text-base font-medium rounded-xl focus-visible:ring-indigo-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-slate-200 bg-slate-50/50 text-base font-medium rounded-xl focus-visible:ring-indigo-500"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-600/20 transition-all mt-4"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
