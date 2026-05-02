import { TuyaService } from '@infrastructure/services/TuyaService';

export class UpdateDeviceStateUseCase {
  constructor(private tuyaService: TuyaService) {}

  async execute(deviceId: string, code: string, value: any): Promise<void> {
    // Orquestra a atualização física do hardware
    await this.tuyaService.updateDeviceState(deviceId, code, value);
  }
}