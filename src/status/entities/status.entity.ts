import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Device } from "../../device/entities/device.entity";

@Entity()
export class Status {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "boolean", default: false })
  genset12Status: boolean;

  @Column({ type: "boolean", default: false })
  genset1Status: boolean;

  @Column({ type: "boolean", default: false })
  genset2Status: boolean;

  @Column({ type: "varchar", default: "false" })
  flag: string;

  @ManyToOne(() => Device, (device) => device.statuses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deviceId" })
  device: Device;

  @Column({ type: "int" })
  deviceId: number;

  // updated part
  @Column({ type: "timestamptz", nullable: true })
  genset1LastTurnedOff: Date;

  @Column({ type: "boolean", default: false })
gensetall: boolean;

  @Column({ type: "timestamptz", nullable: true })
  genset2LastTurnedOff: Date;

  @Column({ type: "timestamptz", nullable: true })
  genset1LastTurnedOn: Date;

  @Column({ type: "timestamptz", nullable: true })
  genset2LastTurnedOn: Date;

}
