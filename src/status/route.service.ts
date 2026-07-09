// src/status/status-update.service.ts
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Status } from "./entities/status.entity";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { StatusService } from "./status.service";

const AWS_URL = "http://13.233.155.239:5070/status/1";
const TARGET_DEVICE_ID = 1;

@Injectable()
export class StatusUpdateService {
  private readonly logger = new Logger(StatusUpdateService.name);

  constructor(
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
    private statusService: StatusService
  ) {}

  async fetchAndUpdateStatus() {
    try {
      const response = await axios.get(AWS_URL);
      const { flag, deviceId, genset12Status, genset1Status, genset2Status } =
        response.data;

      if (flag === "AWS" && deviceId === TARGET_DEVICE_ID) {
        const updateDto: UpdateStatusDto = {
          genset12Status,
          genset1Status,
          genset2Status,
          flag,
        };

        await this.statusService.updateByDeviceId(TARGET_DEVICE_ID, updateDto);
        this.logger.log("Database updated successfully.");
      } else {
        this.logger.warn(
          "Condition not met: flag is not AWS or deviceId is not 1."
        );
      }
    } catch (error) {
      this.logger.error("Error fetching or updating status", error.message);
    }
  }
}
