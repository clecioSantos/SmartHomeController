'use client';

import Link from 'next/link';
import { ArrowRight, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="bg-indigo-500/10 p-6 rounded-full mb-8">
        <Smartphone size={64} className="text-indigo-500" />
      </div>
      <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
        Controle sua casa <br /> 
        <span className="text-indigo-500 underline decoration-indigo-500/30">com inteligência.</span>
      </h1>
      <p className="text-slate-400 text-lg max-w-2xl mb-10 leading-relaxed">
        Um dashboard moderno, rápido e personalizável para gerenciar todos os seus dispositivos inteligentes em um único lugar.
      </p>
      <Link 
        href="/dashboard"
        className="group bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
      >
        Começar agora
        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}