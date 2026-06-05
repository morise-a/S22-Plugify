'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesChartProps {
  data: { name: string; sales: number }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="w-full h-72 min-w-0 min-h-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#9ca3af" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `$${value}`} 
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
              fontSize: '12px',
            }}
            formatter={(value) => [`$${value}`, 'Sales']}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 1 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
