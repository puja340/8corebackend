import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { Status } from "../../status/entities/status.entity";

interface DeviceInfo {
  [key: string]: any;
}

interface SystemInfo {
  [key: string]: any;
}

interface Genset {
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

interface Common {
  voltage: string;
  current: string;
  power: string;
  kva: string;
  freq: string;
}

interface GensetStatus {
  genset1Status: string;
  genset2Status: string;
  genset12Status: string;
}

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "jsonb" })
  genset1: Genset;

  @Column({ type: "jsonb" })
  genset2: Genset;

  

  @Column({ type: "jsonb" })
  common: Common;

 

  @Column({ type: "int" })
  deviceId: number;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @OneToMany(() => Status, (status) => status.device)
  statuses: Status[];
}
