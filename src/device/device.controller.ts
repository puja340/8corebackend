import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
   create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto);
  }

  @Get()
  findAll() {
    return this.deviceService.findAll();
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.deviceService.findOne(parseInt(id));
  }

  @Post('/dashboard-graph')
  dashboardGraph(@Body() body :{type: string, date:string}) {
    return this.deviceService.dashboardGraph(body.type,body.date);
  }

  @Post('/genset-graph')
  gensetGraph(@Body() body :{type: string, genset:string,date:string}) {
    return this.deviceService.gensetGraph(body.type, body.genset, body.date);
  }

  @Patch('/update')
  updateData(@Body() updateDeviceDto: UpdateDeviceDto) {
    return this.deviceService.updateData(updateDeviceDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.deviceService.update(+id, updateDeviceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deviceService.remove(+id);
  }
}
