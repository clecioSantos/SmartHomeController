export class TuyaService {
  async getDeviceStatus(deviceId: string) {
    const res = await fetch(`/api/tuya/status?deviceId=${deviceId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Falha ao buscar status na Tuya');
    return data.deviceStatus?.result || [];
  }

  async updateDeviceState(deviceId: string, code: string, value: any) {
    const res = await fetch("/api/tuya/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Device_ID: deviceId, code, value }),
    });
    const data = await res.json();
    return data;
  }
}