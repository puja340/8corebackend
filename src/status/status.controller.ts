import { Controller, Get, Post, Body, Patch, Param } from "@nestjs/common";
import { StatusService } from "./status.service";
import { CreateStatusDto } from "./dto/status-device.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

@Controller("status")
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  async createGensetStatus(@Body() dto: CreateStatusDto) {
    return await this.statusService.createGensetStatus(dto);
  }

  @Get()
  async getLatestGensetStatus() {
    return await this.statusService.getLatestGensetStatus();
  }

  @Get("/:id")
  findOne(@Param("id") id: string) {
    return this.statusService.findOne(parseInt(id));
  }

  @Patch("/:deviceId")
  update(
    @Param("deviceId") deviceId: number,
    @Body() updateStatusDto: UpdateStatusDto
  ) {
    return this.statusService.updateByDeviceId(+deviceId, updateStatusDto);
  }
}
