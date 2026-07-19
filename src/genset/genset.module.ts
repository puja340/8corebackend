import { Module } from '@nestjs/common';
import { GensetController } from './genset.controller';
import { GensetService } from './genset.service';
import { GensetGateway } from 'src/gateways/genset.gateway';
import { GensetPerformanceGateway } from 'src/gateways/genset-performance.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  controllers: [GensetController],
  providers: [
    GensetService,
    GensetGateway,
    GensetPerformanceGateway,
  ],
})
export class GensetModule {}