import { TuyaService } from '../../../src/infrastructure/services/TuyaService';

export class UpdateDeviceStateUseCase {
  constructor(private tuyaService: TuyaService) {}

  async execute(deviceId: string, code: string, value: any): Promise<void> {
    // Aqui poderíamos adicionar validações de domínio antes de chamar a infra
    await this.tuyaService.updateDeviceState(deviceId, code, value);
  }
}