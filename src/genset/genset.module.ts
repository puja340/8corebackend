// src/genset/genset.module.ts
import { Module } from '@nestjs/common';
import { GensetController } from './genset.controller';
import { GensetService } from './genset.service';
import { GensetGateway } from 'src/gateways/genset.gateway';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),  // ← ADD THIS LINE (global or forRoot() is fine)
  ],
  controllers: [GensetController],
  providers: [GensetService, GensetGateway],
})
export class GensetModule {}