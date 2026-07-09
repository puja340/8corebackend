import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Status } from "./entities/status.entity";
import { CreateStatusDto } from "./dto/status-device.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { warnForEdgeRuntime } from "next/dist/build/swc/generated-native";

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Status)
    private readonly StatusRepository: Repository<Status>
  ) {}

  async createGensetStatus(dto: CreateStatusDto): Promise<Status> {
    const gensetStatus = this.StatusRepository.create(dto);
    return await this.StatusRepository.save(gensetStatus);
  }

  async getLatestGensetStatus(): Promise<Status | null> {
    const latestStatus = await this.StatusRepository.find({
      order: { id: "DESC" },
      take: 1,
    });
    return latestStatus.length > 0 ? latestStatus[0] : null;
  }

 async updateByDeviceId(deviceId: number, updateStatusDto: UpdateStatusDto) {
  const currentStatus = await this.StatusRepository.findOne({
    where: { deviceId: deviceId },
  });

  if (!currentStatus) {
    throw new BadRequestException("No Config Found");
  }

  const now = new Date().getTime();
  const cooldownPeriod = parseInt(process.env.COOLDOWN_TIME, 10); // 3 min default
  const warmupPeriod = parseInt(process.env.WARMUP_TIME, 10);   // 2 min default

  // Helper: Check cooldown for any genset
  const checkCooldown = (lastOff: Date | null, num: number) => {
    if (!lastOff) return null;
    const remaining = cooldownPeriod - (now - lastOff.getTime());
    if (remaining > 0) {
      return { message: `Genset ${num} in cooldown. Wait ${Math.ceil(remaining / 60000)} min`, source: `genset${num}` };
    }
    return null;
  };

  // Helper: Check warmup for any genset
  const checkWarmup = (lastOn: Date | null, num: number) => {
    if (!lastOn) return null;
    const remaining = warmupPeriod - (now - lastOn.getTime());
    if (remaining > 0) {
      return { message: `Genset ${num} in warmup. Wait ${Math.ceil(remaining / 60000)} min`, source: `genset${num}` };
    }
    return null;
  };

  const errors: any[] = [];

  // Check ALL 6 gensets for cooldown/warmup when turning ON/OFF
  for (let i = 1; i <= 6; i++) {
    const field = `genset${i}Status` as keyof typeof updateStatusDto;
    const lastOffField = `genset${i}LastTurnedOff` as keyof typeof currentStatus;
    const lastOnField = `genset${i}LastTurnedOn` as keyof typeof currentStatus;

    if (updateStatusDto[field] === true && currentStatus[field] === false) {
      const err = checkCooldown(currentStatus[lastOffField] as Date | null, i);
      if (err) errors.push(err);
    }
    if (updateStatusDto[field] === false && currentStatus[field] === true) {
      const err = checkWarmup(currentStatus[lastOnField] as Date | null, i);
      if (err) errors.push(err);
    }
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors.map(e => e.message));
  }

  const updates: any = {};

  // Update individual statuses
  for (let i = 1; i <= 6; i++) {
    const field = `genset${i}Status` as keyof UpdateStatusDto;
    if (updateStatusDto[field] !== undefined) {
      updates[field] = updateStatusDto[field];
    }
  }

  // Update master flag
  if (updateStatusDto.genset12Status !== undefined) {
    updates.genset12Status = updateStatusDto.genset12Status;
  }

  if (updateStatusDto.flag !== undefined) {
    updates.flag = updateStatusDto.flag;
  }

  // Update timestamps
  for (let i = 1; i <= 2; i++) {
    const statusKey = `genset${i}Status` as keyof typeof updates;
    const currentKey = `genset${i}Status` as keyof typeof currentStatus;
    const onKey = `genset${i}LastTurnedOn` as keyof typeof updates;
    const offKey = `genset${i}LastTurnedOff` as keyof typeof updates;

    if (updates[statusKey] === true && currentStatus[currentKey] === false) {
      updates[onKey] = new Date();
    }
    if (updates[statusKey] === false && currentStatus[currentKey] === true) {
      updates[offKey] = new Date();
    }
  }

  // APPLY UPDATES
  Object.assign(currentStatus, updates);

  // Recalculate master status: ON if ANY genset is ON
  currentStatus.genset12Status = 
    currentStatus.genset1Status ||
    currentStatus.genset2Status 
  await this.StatusRepository.save(currentStatus);
  return currentStatus;
}
  
  async findOne(deviceId: number) {
    const status = await this.StatusRepository.findOne({
      where: {
        deviceId: deviceId,
      },
    });
  
    if (!status) {
      throw new BadRequestException("No Config Found");
    }
  
    const now = new Date().getTime();
    const cooldownPeriod = parseInt(process.env.COOLDOWN_TIME, 10);
    const warmupPeriod = parseInt(process.env.WARMUP_TIME, 10);
  
    // Calculate remaining times for all gensets
 const calculateRemaining = (timestamp: Date | null, period: number, gensetNumber?: number) => {
  if (!timestamp) return 0;

  const remaining = period - (now - timestamp.getTime());

  // For warmup: only show if that specific genset is currently ON
  if (gensetNumber !== undefined) {
    const statusKey = `genset${gensetNumber}Status` as keyof typeof status;
    if (remaining > 0 && status[statusKey] === true) {
      return Math.max(0, remaining);
    }
  }

  // For cooldown: show remaining time regardless of current status
  return Math.max(0, remaining);
};

// Return all cooldown/warmup times for ALL 6 gensets
return {
  ...status,
  genset1Cooldown: calculateRemaining(status.genset1LastTurnedOff, cooldownPeriod),
  genset2Cooldown: calculateRemaining(status.genset2LastTurnedOff, cooldownPeriod),
  genset1Warmup: calculateRemaining(status.genset1LastTurnedOn, warmupPeriod, 1),
  genset2Warmup: calculateRemaining(status.genset2LastTurnedOn, warmupPeriod, 2),
};
  }
}


