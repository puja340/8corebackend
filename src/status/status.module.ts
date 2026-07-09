import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Status } from "./entities/status.entity";
import { StatusService } from "./status.service";
import { StatusController } from "./status.controller";
import { StatusUpdateService } from "./route.service";  // Import StatusUpdateService

@Module({
  imports: [TypeOrmModule.forFeature([Status])],
  controllers: [StatusController],
  providers: [StatusService, StatusUpdateService],  // Register StatusUpdateService here
})
export class StatusModule {}
