'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
// Importação dinâmica do componente Responsive apenas, sem o WidthProvider legacy
const ResponsiveGridLayout = dynamic(
  () => import('react-grid-layout').then((m) => m.Responsive),
  { ssr: false }
);
import { 
  Plus, 
  Trash2, 
  Layout as LayoutIcon, 
  Power, 
  X,
  Edit3,
  Check,
  Settings2,
  Palette,
  ChevronRight,
  Search
} from 'lucide-react';

// Estilos obrigatórios para o grid
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';


interface Characteristic {
  name: string;
  state: string | boolean | number;
}

interface Location {
  id: string;
  name: string;
  color: string;
}

interface Device {
  id: string;
  name: string;
  location?: Location;
  characteristics: Characteristic[];
  controlCode?: string;
}

export default function DashboardPage() {
  // Hook para gerenciar a largura do container manualmente
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  
  // Estado para evitar erros de hidratação no Next.js
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const [locations, setLocations] = useState<Location[]>([
    { id: '1', name: 'Sala de Estar', color: '#6366f1' },
    { id: '2', name: 'Cozinha', color: '#f59e0b' },
    { id: '3', name: 'Quarto', color: '#10b981' },
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [devices, setDevices] = useState<Device[]>([
    {
      id: 'dev-1',
      name: 'Iluminação Teto',
      location: { id: '1', name: 'Sala de Estar' },
      characteristics: [{ name: 'Status', state: true }, { name: 'Brilho', state: '75%' }]
    },
    {
      id: 'dev-2',
      name: 'Ar Condicionado',
      location: { id: '3', name: 'Quarto', color: '#10b981' },
      characteristics: [{ name: 'Temperatura', state: '22°C' }, { name: 'Modo', state: 'Eco' }]
    }
  ]);

  // Gerenciamos o objeto 'layouts' completo para persistir posições em todos os breakpoints
  const [layouts, setLayouts] = useState<any>({
    lg: [
      { i: 'dev-1', x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 3 },
      { i: 'dev-2', x: 2, y: 0, w: 2, h: 3, minW: 2, minH: 3 },
    ]
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  // Estados para busca de funcionalidades (features)
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);

  // CARREGAR DADOS: Executa apenas uma vez ao montar o componente
  useEffect(() => {
    const savedDevices = localStorage.getItem('smarthome_devices');
    const savedLayouts = localStorage.getItem('smarthome_layouts_v3');
    const savedLocations = localStorage.getItem('smarthome_locations');

    if (savedDevices) {
      try {
        setDevices(JSON.parse(savedDevices));
      } catch (e) {
        console.error("Erro ao carregar dispositivos:", e);
      }
    }

    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (e) {
        console.error("Erro ao carregar layout:", e);
      }
    }

    if (savedLocations) {
      try {
        setLocations(JSON.parse(savedLocations));
      } catch (e) {
        console.error("Erro ao carregar localizações:", e);
      }
    } else {
      setLocations([
        { id: '1', name: 'Sala de Estar', color: '#6366f1' },
        { id: '2', name: 'Cozinha', color: '#f59e0b' },
        { id: '3', name: 'Quarto', color: '#10b981' },
      ]);
    }

    setIsMounted(true);
  }, []);

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: refreshDevicesStatus
  //  Descricao: Consulta a API da Tuya para atualizar o estado real de todos os dispositivos no dashboard
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const refreshDevicesStatus = async () => {
    if (devices.length === 0) return;

    try {
      const updatedDevices = await Promise.all(devices.map(async (device) => {
        // Se nao for um dispositivo real (ID gerado por timestamp), ignora a busca
        if (device.id.startsWith('dev-')) return device;

        try {
          const res = await fetch(`/api/tuya/status?deviceId=${device.id}`);
          const data = await res.json();

          if (data.success && data.deviceStatus?.result) {
            const statusResult = data.deviceStatus.result;
            const targetCode = device.controlCode || 'switch_1';
            
            // Procura o valor atual da feature vinculada ao botao
            const remoteStatus = statusResult.find((r: any) => r.code === targetCode);

            if (remoteStatus !== undefined) {
              const newCharacteristics = device.characteristics.map(char => {
                if (char.name === "Status") {
                  return { ...char, state: remoteStatus.value };
                }
                return char;
              });
              return { ...device, characteristics: newCharacteristics };
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar dispositivo individual:", device.id, err);
        }
        return device;
      }));

      setDevices(updatedDevices);
    } catch (error) {
      console.error("Erro na rotina de atualizacao global:", error);
    }
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: useEffect [Polling]
  //  Descricao: Gerencia o intervalo de atualizacao automatica a cada 2 segundos
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  useEffect(() => {
    if (!isMounted) return;

    const interval = setInterval(() => {
      refreshDevicesStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [isMounted, devices]);

  // SALVAR DADOS: Sempre que dispositivos ou layouts mudarem
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('smarthome_devices', JSON.stringify(devices));
      localStorage.setItem('smarthome_layouts_v3', JSON.stringify(layouts));
      localStorage.setItem('smarthome_locations', JSON.stringify(locations));
    }
  }, [devices, layouts, locations, isMounted]);

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: fetchDeviceFeatures
  //  Descricao: Busca os codigos de estado de um dispositivo via API da Tuya usando Refs de input
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Função para buscar os códigos do dispositivo
  const fetchDeviceFeatures = async (id: string) => {
    if (!id || id.length < 5) return;
    setIsLoadingFeatures(true);
    try {
      const res = await fetch(`/api/tuya/status?deviceId=${id}`);
      const data = await res.json();
      if (data.success && data.deviceStatus?.result) {
        const codes = data.deviceStatus.result.map((item: any) => item.code);
        setAvailableCodes(codes);
      } else {
        setAvailableCodes([]);
      }
    } catch (error) {
      console.error("Erro ao buscar funcionalidades:", error);
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  // Lógica para Salvar (Adicionar ou Editar)
  const handleSaveDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const deviceId = formData.get('deviceId') as string;
    const controlCode = formData.get('controlCode') as string;
    const locationId = formData.get('location') as string;
    const location = locations.find(l => l.id === locationId);

    if (editingDevice) {
      setDevices(devices.map(d => d.id === editingDevice.id ? { ...d, name, location } : d));
    } else {
      const newId = deviceId || `dev-${Date.now()}`;

      // Validação para evitar IDs duplicados que quebram a renderização do React
      if (devices.some(d => d.id === newId)) {
        alert("Erro: Já existe um dispositivo com este ID cadastrado.");
        return;
      }

      const newDevice: Device = {
        id: newId,
        name,
        location,
        controlCode: controlCode || 'switch_1',
        characteristics: [{ name: 'Status', state: false }]
      };
      setDevices([...devices, newDevice]);
      
      // Adiciona o novo card a TODOS os breakpoints registrados para garantir o tamanho 2x3 em qualquer tela
      setLayouts((prev: any) => {
        const updatedLayouts = { ...prev };
        const breakpoints = Object.keys(updatedLayouts);
        breakpoints.forEach((bp) => {
          updatedLayouts[bp] = [
            ...(updatedLayouts[bp] || []), 
            { 
              i: newId, 
              x: 0, 
              y: Infinity, 
              w: 2, h: 3, 
              minW: 2, minH: 3 
            }
          ];
        });
        return updatedLayouts;
      });
    }
    closeModal();
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: handleSaveLocation
  //  Descricao: Gerencia a criacao e edicao de ambientes e sincroniza as cores nos dispositivos
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const handleSaveLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('locName') as string;
    const color = formData.get('locColor') as string;

    if (editingLocation) {
      const updated = locations.map(l => l.id === editingLocation.id ? { ...l, name, color } : l);
      setLocations(updated);
      // Atualiza dispositivos existentes com os novos dados do ambiente
      setDevices(devices.map(d => d.location?.id === editingLocation.id ? { ...d, location: { id: editingLocation.id, name, color } } : d));
      setEditingLocation(null);
    } else {
      setLocations([...locations, { id: `loc-${Date.now()}`, name, color }]);
    }
    e.currentTarget.reset();
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: removeLocation
  //  Descricao: Remove um ambiente e limpa as referencias de localizacao nos cards
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const removeLocation = (id: string) => {
    if (confirm('Tem certeza que deseja remover este ambiente? Dispositivos vinculados ficarão sem localização.')) {
      setLocations(locations.filter(l => l.id !== id));
      // Remove a referência de localização dos dispositivos
      setDevices(devices.map(d => d.location?.id === id ? { ...d, location: undefined } : d));
      if (editingLocation?.id === id) setEditingLocation(null);
    }
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: closeModal
  //  Descricao: Fecha o modal de dispositivos e limpa os estados de edicao
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: removeDevice
  //  Descricao: Remove um dispositivo da lista e limpa seu registro em todos os layouts salvos
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const removeDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
    setLayouts((prev: any) => {
      const updatedLayouts = { ...prev };
      Object.keys(updatedLayouts).forEach(key => {
        updatedLayouts[key] = updatedLayouts[key].filter((l: any) => l.i !== id);
      });
      return updatedLayouts;
    });
  };
async function updateDevice(value: boolean, deviceId: string, code: string) {
    try {
      await fetch("/api/tuya/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            Device_ID: deviceId,
            value: value,
            code: code
         }),
      });

    } catch (error) {
      console.error(error);
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: togglePower
  //  Descricao: Alterna o estado de energia local e dispara o comando remoto via Tuya
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
const togglePower = async (deviceId: string) => {
  let newState = false;
  let targetCode = "switch_1";

  const updatedDevices = devices.map(device => {
    if (device.id !== deviceId) {
      return device;
    }

    targetCode = device.controlCode || "switch_1";

    const updatedCharacteristics = device.characteristics.map(characteristic => {
      if (characteristic.name === "Status") {
        newState = !characteristic.state;

        return {
          ...characteristic,
          state: newState,
        };
      }

      return characteristic;
    });

    return {
      ...device,
      characteristics: updatedCharacteristics,
    };
  });

  setDevices(updatedDevices);

  // chama a API depois
  await updateDevice(newState, deviceId, targetCode);
};

  

  // Não renderiza nada até que o cliente esteja montado para evitar Hydration Mismatch
  if (!isMounted) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">SmartHome Control</h2>
          <p className="text-slate-400 text-sm">Organize e controle seus aparelhos</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-2xl transition-all active:scale-95 border border-slate-700"
            title="Gerenciar Ambientes"
          >
            <Settings2 size={20} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div ref={containerRef} className="w-full">
        <ResponsiveGridLayout
        className="layout"
          layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 10, md: 8, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
          width={width} // Passamos a largura obtida pelo Hook
        draggableHandle=".grid-drag-handle"
        compactType={null} 
        preventCollision={false} // Melhora a sensação de liberdade ao arrastar
          onLayoutChange={(currentLayout, allLayouts) => setLayouts(allLayouts)}
        margin={[20, 20]}
      >
        {devices.map((device) => {
          const isOn = device.characteristics.find(c => c.name === 'Status')?.state === true;
          const themeColor = device.location?.color || '#334155'; // default slate-700
          
          return (
            <div 
              key={device.id} 
              style={{ borderColor: isOn ? themeColor : '#1e293b' }}
              className={`rounded-3xl border-2 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl ${isOn ? 'bg-slate-900 ring-1 ring-white/5' : 'bg-slate-900/80 border-slate-800'}`}
            >
              {/* Handle de Arrasto */}
              <div className="grid-drag-handle p-4 pb-0 flex justify-between items-start cursor-grab active:cursor-grabbing">
                <div className="bg-slate-800 p-2 rounded-xl text-slate-400">
                  <LayoutIcon size={18} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingDevice(device); setIsModalOpen(true); }}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => removeDevice(device.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="font-bold text-white leading-tight truncate">{device.name}</h3>
                  <span style={{ color: themeColor }} className="text-[10px] uppercase tracking-widest font-black opacity-80">
                    {device.location?.name || 'Geral'}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    {device.characteristics.filter(c => typeof c.state !== 'boolean').slice(0, 1).map((c, i) => (
                      <span key={i} className="text-indigo-400 font-mono text-sm">{c.state}</span>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => togglePower(device.id)}
                    style={{ backgroundColor: isOn ? themeColor : '' }}
                    className={`p-3 rounded-2xl transition-all ${
                      isOn 
                        ? 'text-white shadow-lg' 
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <Power size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <button onClick={closeModal} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <h2 className="text-2xl font-bold mb-6">
              {editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}
            </h2>

            <form className="space-y-6" onSubmit={handleSaveDevice}>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                  ID do Dispositivo (DeviceId)
                </label>
                <div className="relative">
                  <input 
                    name="deviceId"
                    id="deviceIdInput"
                    type="text" 
                    required
                    disabled={!!editingDevice}
                    defaultValue={editingDevice?.id}
                    placeholder="Ex: tuya-id-12345" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pr-14 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white disabled:opacity-50"
                  />
                  {!editingDevice && (
                    <button 
                      type="button"
                      onClick={() => fetchDeviceFeatures(deviceIdInputRef.current?.value || "")}
                      className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-xl transition-colors"
                    >
                      {isLoadingFeatures ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                    </button>
                  )}
                </div>
              </div>

              {availableCodes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                    Função de Liga/Desliga
                  </label>
                  <select 
                    name="controlCode"
                    defaultValue={editingDevice?.controlCode}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-white"
                  >
                    {availableCodes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                  Nome do Aparelho
                </label>
                <input 
                  name="name"
                  type="text" 
                  required
                  defaultValue={editingDevice?.name}
                  placeholder="Ex: Smart TV" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                  Localização
                </label>
                <select 
                  name="location"
                  defaultValue={editingDevice?.location?.id}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-white"
                >
                  <option value="">Sem localização</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-white text-slate-950 font-bold py-4 rounded-2xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <Check size={20} />
                {editingDevice ? 'Atualizar' : 'Criar Dispositivo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar de Ambientes */}
      <aside className={`fixed top-0 right-0 h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 transition-all duration-500 z-50 shadow-2xl flex flex-col ${isSidebarOpen ? 'w-full md:w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 flex justify-between items-center border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette size={20} className="text-indigo-400" />
            Ambientes
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* Formulário */}
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Nome do Ambiente</label>
              <input 
                name="locName"
                type="text"
                required
                placeholder="Ex: Cozinha Gourmet"
                defaultValue={editingLocation?.name}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Cor do Tema</label>
              <div className="flex gap-2">
                <input 
                  name="locColor"
                  type="color"
                  defaultValue={editingLocation?.color || '#6366f1'}
                  className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer"
                />
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center px-4 text-sm text-slate-400 italic">
                  Escolha a cor do ambiente
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              {editingLocation ? <Edit3 size={18}/> : <Plus size={18} />}
              {editingLocation ? 'Atualizar Ambiente' : 'Adicionar Ambiente'}
            </button>
            {editingLocation && (
              <button onClick={() => setEditingLocation(null)} type="button" className="w-full text-slate-500 text-xs hover:text-white underline">
                Cancelar Edição
              </button>
            )}
          </form>

          {/* Lista */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase px-1">Seus Ambientes</h3>
            {locations.map(loc => (
              <div key={loc.id} className="group flex items-center justify-between bg-slate-950/50 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <div style={{ backgroundColor: loc.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <span className="text-sm font-medium">{loc.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingLocation(loc)} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => removeLocation(loc.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="text-center text-slate-600 text-xs py-4">Nenhum ambiente criado.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}