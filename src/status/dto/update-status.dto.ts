import { PartialType } from "@nestjs/mapped-types";
import { CreateStatusDto } from "./status-device.dto";

export class UpdateStatusDto extends PartialType(CreateStatusDto) {}
