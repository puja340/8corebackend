import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { Device } from './entities/device.entity';
import { Status } from '../status/entities/status.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, getRepository } from 'typeorm';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
  ) {}
  

  async create(createDeviceDto: CreateDeviceDto) {
    const device = this.deviceRepository.create(createDeviceDto);
    await this.deviceRepository.save(device);
    return device;
  }

  async findAll() {
    const configs = await this.deviceRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
    return configs;
  }

  async findOne(deviceId: number) {
    //return await this.deviceRepository.findOne({ where: { deviceId }, relations: ['statuses'] });
    const device = await this.deviceRepository.find({
      where: { deviceId }
    });

    const statuses = await this.statusRepository.find({
      where: { deviceId },
    });

    return { device, statuses };
  }

  async dashboardGraph(type: string, date: string) {
    const startDate = date ? new Date(date) : new Date();

    // startDate.setHours(0, 0, 0, 0);
    const endDate = date ? new Date(date) : new Date();
    // endDate.setHours(23, 59, 59, 99);

    const configs = [];

    for (let i = 0; i < 24; i++) {
      startDate.setUTCHours(i, 0, 0, 0);
      endDate.setUTCHours(i, 59, 59, 99);
      const config = await this.deviceRepository
        .createQueryBuilder('device')
        .select("device.common->> 'voltage' as voltage")
        .where(`device.created_at BETWEEN :startDate AND :endDate`, {
          startDate,
          endDate,
        })
        .orderBy('created_at', 'DESC')
        .getRawOne();

      configs.push({ hour: i + 1, voltage: config?.voltage || 0 });
      console.log(startDate, endDate);
    }

    return configs;
  }
  async gensetGraph(type: string, genset: string, date: string) {
    const startDate = date ? new Date(date) : new Date();

    // startDate.setHours(0, 0, 0, 0);
    const endDate = date ? new Date(date) : new Date();

    const configs = [];

    for (let i = 0; i < 24; i++) {
      startDate.setUTCHours(i, 0, 0, 0);
      endDate.setUTCHours(i, 59, 59, 99);
      const config = await this.deviceRepository
        .createQueryBuilder('device')
        .select(
          `${genset == '1' ? 'device.genset1' : 'device.genset2'} ->> 'power' as power`,
        )
        .where(`device.created_at BETWEEN :startDate AND :endDate`, {
          startDate,
          endDate,
        })
        .orderBy('created_at', 'DESC')
        .getRawOne();

      configs.push({ hour: i + 1, power: config?.power || 0 });
      console.log(startDate, endDate);
    }

    return configs;
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    const config = await this.deviceRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!config) {
      throw new BadRequestException('No Config Found');
    }
    Object.assign(config, updateDeviceDto);
    await this.deviceRepository.save(config);
    return config;
  }

  async updateData(updateDeviceDto: UpdateDeviceDto) {
    const configs = await this.deviceRepository.find({ take: 1, order: { created_at: "DESC" } })
    if (!configs) {
      throw new BadRequestException('No Config Found');
    }
    const config = configs[0]
    Object.assign(config, updateDeviceDto);
    await this.deviceRepository.save(config);
    return config;
  }

  remove(id: number) {
    return `This action removes a #${id} device`;
  }
}
