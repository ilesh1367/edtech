import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BarChart3 size={40} className="text-[#818cf8]" /> Performance Analytics
        </h1>
        <p className="text-gray-600 font-bold">Monitor student engagement and course performance.</p>
      </div>

      <div className="bg-white border-[3px] border-black border-dashed rounded-3xl p-20 text-center">
        <div className="w-20 h-20 bg-[#F4DFD8] border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-6">
           <BarChart3 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-400">Analytics Dashboard Coming Soon</h2>
        <p className="text-gray-400 font-medium">Detailed insights into your teaching impact are being prepared.</p>
      </div>
    </div>
  );
}