// src/status/status-update.controller.ts
import { Controller, Get } from "@nestjs/common";
import { StatusUpdateService } from "./route.service";

@Controller("status-update")
export class StatusUpdateController {
  constructor(private readonly statusUpdateService: StatusUpdateService) {}

  @Get("trigger")
  async triggerStatusUpdate() {
    await this.statusUpdateService.fetchAndUpdateStatus();
    return { message: "Service triggered manually." };
  }

}
