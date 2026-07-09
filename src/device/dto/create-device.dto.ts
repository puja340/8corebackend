import { IntegerType } from "typeorm";

interface DeviceInfo {
  [key: string]: any;
}

interface SystemInfo {
  [key: string]: any;
} 

interface GensetDTO {
  voltage: string;
  device_id: string;
  location: string;
  power: string;
  kw: string;
  kva: string;
  pf: string;
  current: string; 
  enginerun: string;
  freq: string;
  engineRpm: string;
  coolerTemp: string;
  oilPressure: string;
  batteryVoltage: string;
  fuellevel: string;
  deviceInfo: DeviceInfo;
  systemInfo: SystemInfo;
}

// DTO interface for common data
interface CommonDTO {
  voltage: string;
  current: string;
  power: string;
  kva: string;
  freq: string;
}

// DTO interface for genset status
interface GensetStatusDTO {
  genset1Status: string;
  genset2Status: string;
  genset12Status: string;
}

export class CreateDeviceDto {
  genset1: GensetDTO;
  genset2: GensetDTO;
  common: CommonDTO;
  // genset12Status: boolean;
  // genset1Status: boolean;
  // genset2Status: boolean;
  deviceId: number;
}
