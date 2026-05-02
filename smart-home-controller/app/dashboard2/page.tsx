'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  LayoutGrid, 
  Filter, 
  Power, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Monitor,
  Camera, // Adicionado para ícone de câmera
  Smartphone,
  X
} from 'lucide-react';

const ResponsiveGridLayout = dynamic(
  () => import('react-grid-layout').then((m) => m.Responsive),
  { ssr: false }
);

import { Device, Location } from '@domain/entities/Device';
import { FirebaseDashboardRepository } from '@infrastructure/repositories/FirebaseDashboardRepository';
import { TuyaService } from '@infrastructure/services/TuyaService';
import { UpdateDeviceStateUseCase } from '@application/use-cases/UpdateDeviceStateUseCase';
import CameraStream from '@components/CameraStream'; // Importa o CameraStream

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const dashboardRepo = new FirebaseDashboardRepository();
const tuyaService = new TuyaService();
const updateDeviceUseCase = new UpdateDeviceStateUseCase(tuyaService);

const MinimalistDashboard = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'location'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Sincronização em tempo real (Polling)
  const refreshStatus = async () => {
    if (devices.length === 0) return;
    try {
      const updated = await Promise.all(devices.map(async (device) => {
        if (device.id.startsWith('dev-')) return device;
        const res = await fetch(`/api/tuya/status?deviceId=${device.id}`);
        const data = await res.json();
        if (data.success && data.deviceStatus?.result) {
          const newChars = device.characteristics.map(char => {
            const match = data.deviceStatus.result.find((r: any) => r.code === char.code);
            return match ? { ...char, state: match.value } : char;
          });
          return { ...device, characteristics: newChars };
        }
        return device;
      }));
      setDevices(updated);
    } catch (e) { console.error("Polling error", e); }
  };

  useEffect(() => {
    if (!isMounted) return;
    const interval = setInterval(refreshStatus, 600000);
    return () => clearInterval(interval);
  }, [isMounted, devices]);

  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      const config = await dashboardRepo.loadConfig();
      if (config) {
        setDevices(config.devices || []);
        setLocations(config.locations || []);
        setVisibleIds(config.devices?.map(d => d.id) || []); 
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleDeviceVisibility = (id: string) => {
    setVisibleIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const togglePower = async (deviceId: string, code: string, currentState: any) => {
    const newState = !currentState;
    console.log("Mensagem simples");
    setDevices(prev => prev.map(d => d.id === deviceId 
      ? { ...d, characteristics: d.characteristics.map(c => c.code === code ? { ...c, state: newState } : c) } 
      : d
    ));
    await updateDeviceUseCase.execute(deviceId, code, newState);
  };

  const filteredDevices = devices.filter(d => visibleIds.includes(d.id));

  if (!isMounted) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#004b93] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">

      {/* Sidebar de Seleção Minimalista */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0a0a0a] border-r border-[#1a1a1a] transition-all duration-300 transform ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className={`font-black uppercase tracking-tighter text-xs transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>
              Seletor
            </h2>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#111] rounded text-[#888]">
              {isSidebarOpen ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
            </button>
          </div>

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-3 block">Filtrar por</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {setFilterMode('all'); setSelectedLocation(null);}}
                    className={`py-2 px-3 text-[10px] font-bold uppercase rounded border transition-all ${filterMode === 'all' ? 'bg-[#004b93] border-[#004b93]' : 'bg-[#111] border-[#222] text-[#666]'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilterMode('location')}
                    className={`py-2 px-3 text-[10px] font-bold uppercase rounded border transition-all ${filterMode === 'location' ? 'bg-[#004b93] border-[#004b93]' : 'bg-[#111] border-[#222] text-[#666]'}`}
                  >
                    Ambiente
                  </button>
                </div>
              </div>

              {filterMode === 'location' && (
                <div className="space-y-1">
                  {locations.map(loc => (
                    <button 
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc.id === selectedLocation ? null : loc.id)}
                      className={`w-full flex items-center gap-2 p-2 text-xs rounded transition-colors ${selectedLocation === loc.id ? 'bg-[#111] text-white' : 'text-[#555] hover:text-white'}`}
                    >
                      <div style={{ backgroundColor: loc.color }} className="w-2 h-2 rounded-full" />
                      {loc.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-3 block">Visibilidade</label>
                {devices
                  .filter(d => !selectedLocation || d.location?.id === selectedLocation)
                  .map(device => (
                    <div 
                      key={device.id} 
                      onClick={() => toggleDeviceVisibility(device.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer border rounded transition-all ${visibleIds.includes(device.id) ? 'bg-[#111] border-[#004b93]/50' : 'bg-transparent border-[#1a1a1a] opacity-40 hover:opacity-100'}`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-tight">{device.name}</span>
                      {visibleIds.includes(device.id) && <Check size={14} className="text-[#004b93]" />}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col transition-all lg:pl-16 overflow-y-auto">
        <header className="p-6 lg:px-12 flex justify-between items-end border-b border-[#111]">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Pure<span className="text-[#004b93]">View</span></h1>
            <p className="text-[10px] text-[#444] font-bold tracking-[0.3em] uppercase mt-1">Dashboard de Performance Minimalista</p>
          </div>
          <div className="hidden sm:flex gap-6 text-[#333]">
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span className="text-[10px] font-bold uppercase">4K Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone size={14} />
              <span className="text-[10px] font-bold uppercase">Responsive</span>
            </div>
          </div>
        </header>

        <div ref={containerRef} className="p-6 lg:p-12 flex-1">
            <ResponsiveGridLayout
            className="layout"
            layouts={{
                lg: filteredDevices.map((d) => {
                const isCam = d.characteristics.some((c: any) => c.code === 'camera_url');
                return { i: d.id, x: 0, y: Infinity, w: 2, h: isCam ? 5 : 2 };
                }),
                md: filteredDevices.map((d) => {
                const isCam = d.characteristics.some((c: any) => c.code === 'camera_url');
                return { i: d.id, x: 0, y: Infinity, w: 3, h: isCam ? 6 : 2 };
                }),
                sm: filteredDevices.map((d) => {
                const isCam = d.characteristics.some((c: any) => c.code === 'camera_url');
                return { i: d.id, x: 0, y: Infinity, w: 3, h: isCam ? 6 : 2 };
                }),
                xs: filteredDevices.map((d) => {
                const isCam = d.characteristics.some((c: any) => c.code === 'camera_url');
                return { i: d.id, x: 0, y: Infinity, w: 4, h: isCam ? 7 : 2 };
                }),
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            width={containerWidth}
            margin={[12, 12]}
            compactType="vertical"
            useCSSTransforms={true}
            {...({
                draggableHandle: ".drag-handle"
            } as any)}
            >
            {filteredDevices.map(device => {
              const cameraChar = device.characteristics.find(c => c.code === 'camera_url');
              // Busca robusta: prioriza códigos conhecidos da Tuya ou qualquer valor booleano
              const mainSwitchChar = device.characteristics.find(c =>
                c.code?.toLowerCase().includes('switch') || typeof c.state === 'boolean'
              );
              const isOn = mainSwitchChar?.state === true || mainSwitchChar?.state === 1;
              const themeColor = device.location?.color || '#004b93';

              return (
                <div key={device.id} className="relative group overflow-hidden">
                  <div 
                    className={`absolute inset-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded transition-all duration-300 ${isOn && !cameraChar ? 'shadow-[inset_0_0_10px_rgba(0,75,147,0.1)]' : ''}`}
                    style={{ borderTop: (isOn && !cameraChar) ? `2px solid ${themeColor}` : '1px solid #1a1a1a' }}
                  >
                    <div className="h-full flex flex-col p-3">
                      {cameraChar ? (
                        <>
                          <div className="flex justify-between items-center mb-2 border-b border-[#1a1a1a] pb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-tight text-[#eee] truncate">
                              {device.name}
                            </h3>
                            <Camera size={12} className="text-[#444]" />
                          </div>
                          <div className="flex-1 relative bg-black rounded-sm overflow-hidden aspect-[16/24]">
                            <CameraStream streamName={cameraChar.state as string} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-auto">
                            <div className="drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                              <LayoutGrid size={10} className="text-[#333]" />
                            </div>
                            <span className="text-[9px] font-bold text-[#333] uppercase tracking-tighter">
                              {device.location?.name || 'Geral'}
                            </span>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-[11px] font-black uppercase tracking-tight text-[#eee] truncate leading-none mb-1">
                                {device.name}
                              </h3>
                            </div>
                            {mainSwitchChar && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePower(device.id, mainSwitchChar.code!, mainSwitchChar.state); }}
                                className={`flex-shrink-0 w-9 h-9 flex items-center justify-center transition-all ${isOn ? 'bg-[#004b93] text-white shadow-[0_0_15px_rgba(0,75,147,0.4)]' : 'bg-[#111] text-[#444] hover:text-[#888]'} rounded-full`}
                              >
                                <Power size={14} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>
          
          {filteredDevices.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[#111] rounded-xl text-[#333]">
              <Filter size={32} className="mb-2 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum dispositivo visível</p>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="mt-4 text-[10px] text-[#004b93] font-black uppercase underline underline-offset-4"
              >
                Abrir Seletor
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Overlay para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MinimalistDashboard;