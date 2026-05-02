export type CharacteristicValue = string | boolean | number;

export interface Characteristic {
  name: string;
  state: CharacteristicValue;
  code?: string;
}

export interface Location {
  id: string;
  name: string;
  color: string;
}

export class Device {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly characteristics: Characteristic[],
    public readonly location?: Location | null,
    public readonly controlCode?: string
  ) {}

  static create(data: Partial<Device>): Device {
    return new Device(
      data.id || `dev-${Date.now()}`,
      data.name || '',
      data.characteristics || [],
      data.location || null,
      data.controlCode
    );
  }
}