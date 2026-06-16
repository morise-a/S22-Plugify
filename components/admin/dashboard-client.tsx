'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DollarSign, Users, Package, ShoppingBag, PlusCircle, Settings, Mail, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// Dynamically import Recharts SalesChart with SSR disabled to prevent hydration failures
const SalesChart = dynamic(() => import('./sales-chart'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-medium">Loading sales graph...</div>,
});

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  billing_first_name: string;
  billing_last_name: string;
  billing_email: string;
}

interface AdminDashboardClientProps {
  metrics: {
    totalRevenue: number;
    customerCount: number;
    productCount: number;
    recentOrders: RecentOrder[];
    chartData: { name: string; sales: number }[];
  };
}

export function AdminDashboardClient({ metrics }: AdminDashboardClientProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-slate-200/40">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Console Dashboard</h1>
        <p className="text-xs text-slate-500">Monitor active subscription streams, product details, and store revenues</p>
      </div>

      {/* 1. Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        {/* Metric Card 1: Revenue */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(79,70,229,0.04)] hover:border-indigo-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/[0.03] to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 capitalize tracking-widest block">Total Revenue</span>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/30 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +14.2% from last month
              </span>
            </div>
            <div className="h-12 w-12 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 group-hover:shadow-lg group-hover:shadow-indigo-600/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Metric Card 2: Customers */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(16,185,129,0.04)] hover:border-emerald-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-500/[0.03] to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 capitalize tracking-widest block">Active Customers</span>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                {metrics.customerCount.toLocaleString()}
              </h3>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100/30 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +6.8% from last week
              </span>
            </div>
            <div className="h-12 w-12 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:shadow-lg group-hover:shadow-emerald-600/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Metric Card 3: Products */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(245,158,11,0.04)] hover:border-amber-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-amber-500/[0.03] to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 capitalize tracking-widest block">Active Products</span>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                {metrics.productCount}
              </h3>
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100/30 px-2 py-0.5 rounded-full inline-flex items-center">
                Catalog Active
              </span>
            </div>
            <div className="h-12 w-12 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 group-hover:shadow-lg group-hover:shadow-amber-500/20">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Charts and Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Sales Chart Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col gap-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800 capitalize tracking-wider">Weekly Revenue Stream</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Performance tracking of successful transactions</p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-500 font-bold">Last 7 Days</Badge>
          </div>
          <SalesChart data={metrics.chartData} />
        </div>

        {/* Quick Actions Panel */}
        <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 capitalize tracking-wider">Console Shortcuts</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Quick platform configuration management</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Use these shortcuts to adjust digital license catalogs, edit customer email notifications, or configure your Stripe and SMTP gateway settings.
            </p>
          </div>

          <div className="space-y-2 pt-6">
            <Link href="/admin/products" className="block group">
              <div className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white hover:border-indigo-600 hover:bg-slate-50/50 hover:shadow-sm text-xs font-semibold text-slate-700 transition-all duration-200 cursor-pointer">
                <span className="flex items-center gap-2.5">
                  <PlusCircle className="h-4 w-4 text-indigo-500 group-hover:scale-105 transition-transform" />
                  Add Catalog Product
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>

            <Link href="/admin/templates" className="block group">
              <div className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white hover:border-indigo-600 hover:bg-slate-50/50 hover:shadow-sm text-xs font-semibold text-slate-700 transition-all duration-200 cursor-pointer">
                <span className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-indigo-500 group-hover:scale-105 transition-transform" />
                  Edit Mail Templates
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>

            <Link href="/admin/settings" className="block group">
              <div className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200/60 bg-white hover:border-indigo-600 hover:bg-slate-50/50 hover:shadow-sm text-xs font-semibold text-slate-700 transition-all duration-200 cursor-pointer">
                <span className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-indigo-500 group-hover:scale-105 transition-transform" />
                  Stripe & SMTP Settings
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Recent Orders Table */}
      <div className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 capitalize tracking-wider">Recent Checkouts</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Overview of the last 5 registered customer purchases</p>
        </div>

        {metrics.recentOrders.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
            No checkout transactions recorded.
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-100 hover:bg-slate-50/70">
                  <TableHead className="font-bold text-slate-500 text-xs py-3 pl-4">Order Ref</TableHead>
                  <TableHead className="font-bold text-slate-500 text-xs py-3">Customer Details</TableHead>
                  <TableHead className="font-bold text-slate-500 text-xs py-3">Date Placed</TableHead>
                  <TableHead className="font-bold text-slate-500 text-xs py-3">Transaction Total</TableHead>
                  <TableHead className="font-bold text-slate-500 text-xs py-3 pr-4">Order Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {metrics.recentOrders.map((order) => {
                  const badgeVariants: Record<string, 'success' | 'warning' | 'destructive'> = {
                    paid: 'success',
                    pending: 'warning',
                    failed: 'destructive',
                    cancelled: 'destructive',
                  };

                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/20 transition-colors">
                      <TableCell className="font-mono font-bold text-xs py-3.5 pl-4 text-slate-850">{order.order_number}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {order.billing_first_name} {order.billing_last_name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold mt-0.5">{order.billing_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-semibold py-3" suppressHydrationWarning>
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 text-xs py-3">${order.total.toFixed(2)}</TableCell>
                      <TableCell className="py-3 pr-4">
                        <Badge variant={badgeVariants[order.status] || 'warning'} className="capitalize text-[9px] tracking-wider font-bold px-2 py-0.5 rounded-md">
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
