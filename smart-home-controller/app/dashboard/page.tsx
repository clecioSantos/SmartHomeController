'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
// Importação dinâmica do componente Responsive apenas, sem o WidthProvider legacy
const ResponsiveGridLayout = dynamic(
  () => import('react-grid-layout').then((m) => m.Responsive),
  { ssr: false }
);
import { Layouts, Layout, LayoutItem } from 'react-grid-layout';

// IMPORTAÇÕES ORGANIZADAS COM PATH ALIASES
import { Device, Location, Characteristic } from '@domain/entities/Device';
import { FirebaseDashboardRepository } from '@infrastructure/repositories/FirebaseDashboardRepository';
import { SaveDashboardConfigUseCase } from '@application/use-cases/SaveDashboardConfig';
import { TuyaService } from '@infrastructure/services/TuyaService';
import { UpdateDeviceStateUseCase } from '@application/use-cases/UpdateDeviceStateUseCase';

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
  ChevronRight, // Mantido para compatibilidade, embora não usado diretamente no dashboard atual
  Search,
  PlusCircle // Adicionado para o botão de adicionar funções
} from 'lucide-react';

// Estilos obrigatórios para o grid
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Injeção de dependências inicializada fora do componente para performance
const dashboardRepo = new FirebaseDashboardRepository();
const tuyaService = new TuyaService();

const saveConfigUseCase = new SaveDashboardConfigUseCase(dashboardRepo);
const updateDeviceUseCase = new UpdateDeviceStateUseCase(tuyaService);

export default function DashboardPage() {
  // Hook para gerenciar a largura do container manualmente
  const containerRef = useRef<HTMLDivElement>(null);
  const deviceIdInputRef = useRef<HTMLInputElement>(null);
  const [width] = useState(1200);
  const [isMounted, setIsMounted] = useState(false);

  const [locations, setLocations] = useState<Location[]>([
    { id: '1', name: 'Sala de Estar', color: '#6366f1' },
    { id: '2', name: 'Cozinha', color: '#10b981' },
    { id: '3', name: 'Quarto', color: '#f59e0b' },
  ]);

  const [devices, setDevices] = useState<Device[]>([
    {
      id: 'dev-1',
      name: 'Iluminação Teto',
      location: { id: '1', name: 'Sala de Estar', color: '#6366f1' },
      characteristics: [{ name: 'Status', state: true, code: 'switch_1' }]
    },
    {
      id: 'dev-2',
      name: 'Ar Condicionado',
      location: { id: '3', name: 'Quarto', color: '#f59e0b' },
      characteristics: [{ name: 'Status', state: false, code: 'switch_1' }]
    }
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Gerenciamos o objeto 'layouts' completo para persistir posições em todos os breakpoints
  const [layouts, setLayouts] = useState<Layouts>({
    lg: [
      { i: 'dev-1', x: 0, y: 0, w: 2, h: 3, minW: 2, minH: 3 },
      { i: 'dev-2', x: 2, y: 0, w: 2, h: 3, minW: 2, minH: 3 },
    ],
    md: [],
    sm: [],
    xs: [],
    xxs: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [tempCharacteristics, setTempCharacteristics] = useState<Characteristic[]>([]);

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: useEffect_FirestoreLoader
  //  Descricao: Carrega dados salvos no navegador ao iniciar a aplicacao para garantir persistencia
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // CARREGAR DADOS: Executa apenas uma vez ao montar o componente
  useEffect(() => {
    const loadRemoteData = async () => {
      try {
        const config = await dashboardRepo.loadConfig();
        if (config) {
          setDevices(config.devices);
          setLayouts(config.layouts);
          setLocations(config.locations);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
      } finally {
        setIsMounted(true);
      }
    };

    loadRemoteData();
  }, []);

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: saveDataToFirestore
  //  Descricao: Persiste as configuracoes de dispositivos, layouts e locais no Cloud Firestore
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const saveDataToFirestore = async (newDevices: Device[], newLayouts: Layouts, newLocations: Location[]) => {
    if (!isMounted) return;
    try {
      await saveConfigUseCase.execute({ devices: newDevices, layouts: newLayouts, locations: newLocations });
    } catch (error) {
      console.error(error);
    }
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: refreshDevicesStatus
  //  Descricao: Sincroniza o estado real de todas as funcoes dos dispositivos via API Tuya
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const refreshDevicesStatus = async () => {
    if (devices.length === 0) return;

    try {
      const updatedDevices = await Promise.all(devices.map(async (device) => {
        if (device.id.startsWith('dev-')) return device;

        try {
          const res = await fetch(`/api/tuya/status?deviceId=${device.id}`);
          const data = await res.json();

          if (data.success && data.deviceStatus?.result) {
            const statusResult = data.deviceStatus.result;

            const newCharacteristics = device.characteristics.map(char => {
              const remoteMatch = statusResult.find((r: any) => r.code === char.code);
              // Garante que não injetamos 'undefined' no estado local vindo da API
              if (remoteMatch?.value !== undefined) {
                return { ...char, state: remoteMatch.value };
              }
              return char;
            });

            return { ...device, characteristics: newCharacteristics };
          }
        } catch (err) {
          console.error("Erro sincronizando device:", device.id, err);
        }
        return device;
      }));

      setDevices(updatedDevices);
    } catch (error) {
      console.error("Erro polling global:", error);
    }
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: useEffect_Polling
  //  Descricao: Gerencia a atualizacao automatica a cada 2 segundos
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

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: fetchDeviceFeatures
  //  Descricao: Busca os codigos de comando disponiveis no hardware via API
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
        const codes = data.deviceStatus.result
          .map((item: any) => item.code as string)
          .filter((c: any) => c !== undefined && c !== null); // Filtra códigos inválidos
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

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: handleSaveDevice
  //  Descricao: Cria ou edita um dispositivo com N funcoes e persiste no Firestore
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  const handleSaveDevice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const deviceId = formData.get('deviceId') as string;
    const locationId = formData.get('location') as string;
    const location = locations.find(l => l.id === locationId);

    let finalDevices: Device[];
    let finalLayouts: Layouts;

    if (editingDevice) {
      finalDevices = devices.map(d => d.id === editingDevice.id ? {
        ...d, 
        name, 
        location: location || null, // Firestore não aceita undefined, use null
        characteristics: tempCharacteristics 
      } : d);
      finalLayouts = { ...layouts }; // Layouts não mudam ao editar detalhes do dispositivo
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
        location: location || null, // Firestore não aceita undefined, use null
        characteristics: tempCharacteristics
      };
      finalDevices = [...devices, newDevice];

      const newLayoutsForNewDevice: Layouts = {};
      // Correção da lógica de layout e remoção do Infinity (não suportado pelo Firestore)
      const availableBreakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
      const columnCounts: { [key: string]: number } = { lg: 10, md: 8, sm: 6, xs: 4, xxs: 2 };

      availableBreakpoints.forEach((bp) => {
        const existingLayout = layouts[bp] || [];
        const nextX = (existingLayout.length * 2) % (columnCounts[bp] || 2);
        newLayoutsForNewDevice[bp] = [
          ...existingLayout, 
          { i: newId, x: nextX, y: 99, w: 2, h: 3, minW: 2, minH: 3 }
        ];
      });
      finalLayouts = newLayoutsForNewDevice;
    }

    // Atualiza o estado local primeiro
    setDevices(finalDevices);
    setLayouts(finalLayouts); // Garante que os layouts sejam atualizados para novos dispositivos
    // Em seguida, persiste no Firestore
    saveDataToFirestore(finalDevices, finalLayouts, locations);
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
      // Remove a referência de localização dos dispositivos, usando null para Firestore
      setDevices(devices.map(d => d.location?.id === id ? { ...d, location: null } : d));
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
  const removeDevice = async (id: string) => {
    const updatedDevices = devices.filter(d => d.id !== id);
    setDevices(updatedDevices);
    setLayouts((prev: Layouts) => {
      const updatedLayouts = { ...prev };
      const breakpoints = Object.keys(updatedLayouts);
      breakpoints.forEach(key => {
        updatedLayouts[key] = updatedLayouts[key].filter((l: Layout) => l.i !== id);
      });
      saveDataToFirestore(updatedDevices, updatedLayouts, locations); // Salva as alterações de layout após a remoção
      return updatedLayouts;
    });
  };

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: updateDevice
  //  Descricao: Envia comandos de estado para a API da Tuya para controle de hardware
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  async function updateDevice(value: boolean, deviceId: string, code: string) {
    try {
      await updateDeviceUseCase.execute(deviceId, code, value);
    } catch (error) {
      console.error(error);
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  //       Nome: togglePower
  //  Descricao: Alterna o estado de uma funcao especifica e sincroniza via nuvem
  //
  //    Criacao: 26/04/2026  Clecio Santos [SHC-4]
  // Modificado: 
  //
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
const togglePower = async (deviceId: string, featureCode: string) => {
  let newState: any = false;

  const updatedDevices = devices.map(device => {
    if (device.id !== deviceId) {
      return device;
    }

    const characteristics = device.characteristics.map(characteristic => {
      if (characteristic.code === featureCode) {
        newState = !characteristic.state;
        return { ...characteristic, state: newState };
      }

      return characteristic;
    });

    return {
      ...device,
      characteristics,
    };
  });

  console.log(`[Dashboard] Clique em função: Device=${deviceId}, Code=${featureCode}, NovoEstado=${newState}`);
  setDevices(updatedDevices);

  // chama a API depois
  await updateDevice(newState, deviceId, featureCode);
};

  

  // Não renderiza nada até que o cliente esteja montado para evitar Hydration Mismatch
  if (!isMounted) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white overflow-x-hidden relative flex flex-col font-sans">
      {/* Header Fixo no topo ocupando a largura total */}
      <header className="sticky top-0 w-full px-10 py-5 flex justify-between items-center z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222222]">
        <div className="flex flex-col">
          <h2 className="text-xl font-black italic text-white tracking-tighter uppercase">SmartHome <span className="text-[#004b93]">Control</span></h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#888888] hover:text-white p-2 transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest"
            title="Gerenciar Ambientes"
          >
            <Settings2 size={18} />
            <span className="hidden sm:inline">Ambientes</span>
          </button>
          <button 
            onClick={() => {
              setEditingDevice(null);
              setTempCharacteristics([]);
              setIsModalOpen(true);
            }}
            className="bg-[#004b93] hover:bg-[#005bb5] text-white px-6 py-2 rounded-none transition-all active:scale-95 font-bold uppercase text-xs tracking-[0.2em] border-b-2 border-white/20"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 w-full py-12 mx-auto" style={{ width: '1200px' }}>
        <ResponsiveGridLayout
        className="layout"
          layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 10, md: 8, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
          width={width}
        draggableHandle=".grid-drag-handle"
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={(currentLayout, allLayouts) => {
          setLayouts(allLayouts);
          saveDataToFirestore(devices, allLayouts, locations); // Salva as alterações de layout
        }}
        margin={[30, 30]}
      >
        {devices.map((device) => {
          const isOn = device.characteristics.find(c => c.name === 'Status')?.state === true;
          const themeColor = device.location?.color || '#004b93'; 
          
          return (
            <div 
              key={device.id} 
              className={`bg-[#111111] border-l-4 rounded-sm flex flex-col overflow-hidden transition-all duration-500 shadow-2xl hover:translate-y-[-4px] ${isOn ? 'border-[#004b93]' : 'border-[#333333]'}`}
              style={{ borderLeftColor: isOn ? themeColor : '#222222' }}
            >
              <div className="grid-drag-handle p-4 pb-0 flex justify-between items-start cursor-grab active:cursor-grabbing group">
                <div className={`p-1.5 rounded-sm transition-colors ${isOn ? 'text-[#004b93]' : 'text-[#444444]'}`}>
                  <LayoutIcon size={16} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingDevice(device); setTempCharacteristics(device.characteristics); setIsModalOpen(true); }}
                    className="p-2 text-[#444444] hover:text-white transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => removeDevice(device.id)} className="p-2 text-[#444444] hover:text-[#e10600] transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
 
              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-md font-bold text-white uppercase tracking-wider truncate">{device.name}</h3>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#888888] block mt-1">
                    {device.location?.name || 'Standard'}
                  </span>
                </div>

                <div className="mt-auto space-y-1.5">
                  {device.characteristics.map((char, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-none border border-[#222222]">
                      <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest truncate mr-2">{char.name}</span>
                      {typeof char.state === 'boolean' ? (
                        <button 
                          onClick={() => togglePower(device.id, char.code || '')}
                          className={`p-2 transition-all ${
                            char.state 
                              ? 'bg-[#004b93] text-white shadow-[0_0_15px_rgba(0,75,147,0.5)]' 
                              : 'bg-[#1a1a1a] text-[#444444] hover:bg-[#222222]'
                          }`}
                        >
                          <Power size={14} />
                        </button>
                      ) : (
                        <span className="text-xs font-mono font-bold text-[#004b93]">{char.state}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#222222] w-full max-w-md rounded-none shadow-2xl p-10 relative">
            <div className="absolute top-0 right-0 p-6">
              <button onClick={closeModal} className="text-[#888888] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-8 border-l-4 border-[#004b93] pl-4">
              {editingDevice ? 'Configurar' : 'Registrar'}
            </h2>

            <form className="space-y-6" onSubmit={handleSaveDevice}>
              <div>
                <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-widest mb-2">
                  ID do Dispositivo
                </label>
                <div className="relative">
                  <input 
                    name="deviceId"
                    ref={deviceIdInputRef}
                    type="text" 
                    required
                    disabled={!!editingDevice}
                    defaultValue={editingDevice?.id}
                    placeholder="Ex: tuya-id-12345" 
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-none px-4 py-3 pr-14 focus:border-[#004b93] outline-none transition-all text-white disabled:opacity-50"
                  />
                  {!editingDevice && (
                    <button 
                      type="button"
                      onClick={() => fetchDeviceFeatures(deviceIdInputRef.current?.value || "")}
                      className="absolute right-1 top-1 bottom-1 bg-[#004b93] hover:bg-[#005bb5] text-white px-3 transition-colors"
                    >
                      {isLoadingFeatures ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-widest mb-2">
                  Nome do Aparelho
                </label>
                <input 
                  name="name"
                  type="text" 
                  required
                  defaultValue={editingDevice?.name}
                  placeholder="Ex: Smart TV" 
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-none px-4 py-3 focus:border-[#004b93] outline-none transition-all text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-widest mb-2">
                  Localização
                </label>
                <select 
                  name="location"
                  defaultValue={editingDevice?.location?.id}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-none px-4 py-3 focus:border-[#004b93] outline-none appearance-none text-white"
                >
                  <option value="">Sem localização</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-widest">
                    Funções
                  </label>
                  {availableCodes.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setTempCharacteristics([...tempCharacteristics, { name: 'Nova Funcao', code: availableCodes[0] || '', state: false }])}
                      className="text-[#004b93] hover:text-white text-[10px] font-black uppercase flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle size={14} /> Novo
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {tempCharacteristics.map((char, idx) => (
                    <div key={idx} className="bg-[#0a0a0a] p-4 rounded-none border border-[#222222] space-y-3">
                      <div className="flex gap-2">
                        <input 
                          placeholder="Nome da Funcao"
                          value={char.name}
                          onChange={(e) => {
                            const updated = [...tempCharacteristics];
                            updated[idx].name = e.target.value;
                            setTempCharacteristics(updated);
                          }}
                          className="flex-1 bg-transparent border-b border-[#333333] px-1 py-1 text-xs outline-none focus:border-[#004b93] text-white"
                        />
                        <button type="button" onClick={() => setTempCharacteristics(tempCharacteristics.filter((_, i) => i !== idx))} className="text-[#444444] hover:text-[#e10600]">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select 
                          value={char.code}
                          onChange={(e) => {
                            const updated = [...tempCharacteristics];
                            updated[idx].code = e.target.value;
                            setTempCharacteristics(updated);
                          }}
                          className="flex-1 bg-[#1a1a1a] border border-[#333333] px-2 py-1 text-[10px] text-white outline-none focus:border-[#004b93]"
                        >
                          {availableCodes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <span className="text-[8px] text-[#444444] font-black uppercase tracking-tighter">Tuya Sync</span>
                      </div>
                    </div>
                  ))}
                  {availableCodes.length === 0 && !isLoadingFeatures && (
                    <p className="text-[10px] text-[#444444] text-center italic">Aguardando ID do hardware...</p>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#004b93] text-white font-black uppercase tracking-[0.3em] py-4 rounded-none hover:bg-[#005bb5] transition-all flex items-center justify-center gap-2 mt-6 shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
              >
                <Check size={20} />
                {editingDevice ? 'Atualizar' : 'Confirmar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar de Ambientes */}
      <aside className={`fixed top-0 right-0 h-full bg-white border-l border-[#e3e8ee] transition-all duration-500 z-50 shadow-2xl flex flex-col ${isSidebarOpen ? 'w-full md:w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-8 flex justify-between items-center border-b border-[#e3e8ee]">
          <h2 className="text-xl font-semibold text-[#1a1f36] flex items-center gap-3">
            <Palette size={22} className="text-[#635bff]" />
            Ambientes
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-[#4f566b] hover:text-[#1a1f36] rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-10">
          {/* Formulário */}
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#4f566b] px-1">Nome do Ambiente</label>
              <input 
                name="locName"
                type="text"
                required
                placeholder="Ex: Cozinha Gourmet"
                defaultValue={editingLocation?.name}
                className="w-full bg-white border border-[#e3e8ee] rounded-[8px] px-4 py-3 outline-none focus:border-[#635bff] transition-all text-[#1a1f36]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#4f566b] px-1">Cor do Tema</label>
              <div className="flex gap-2">
                <input 
                  name="locColor"
                  type="color"
                  defaultValue={editingLocation?.color || '#6366f1'}
                  className="w-12 h-12 rounded-[8px] bg-transparent border-none cursor-pointer"
                />
                <div className="flex-1 bg-[#f6f9fc] border border-[#e3e8ee] rounded-[8px] flex items-center px-4 text-xs text-[#4f566b] italic">
                  Escolha a cor do ambiente
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#635bff] hover:shadow-md text-white font-bold py-3 rounded-[8px] transition-all flex items-center justify-center gap-2">
              {editingLocation ? <Edit3 size={18}/> : <Plus size={18} />}
              {editingLocation ? 'Atualizar Ambiente' : 'Adicionar Ambiente'}
            </button>
            {editingLocation && (
              <button onClick={() => setEditingLocation(null)} type="button" className="w-full text-[#4f566b] text-xs hover:text-[#1a1f36] underline">
                Cancelar Edição
              </button>
            )}
          </form>

          {/* Lista */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#1a1f36] px-1">Seus Ambientes</h3>
            {locations.map(loc => (
              <div key={loc.id} className="group flex items-center justify-between bg-white p-4 rounded-[8px] border border-[#e3e8ee] hover:border-[#635bff] transition-all">
                <div className="flex items-center gap-3">
                  <div style={{ backgroundColor: loc.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <span className="text-sm font-medium text-[#1a1f36]">{loc.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingLocation(loc)} className="p-2 text-[#4f566b] hover:text-[#1a1f36] transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => removeLocation(loc.id)} className="p-2 text-[#4f566b] hover:text-[#ff4d4d] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="text-center text-[#4f566b] text-xs py-4">Nenhum ambiente criado.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}