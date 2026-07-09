import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DeviceModule } from "./device/device.module";
import { StatusModule } from "./status/status.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GensetModule } from "./genset/genset.module";
import { PowerModule } from "./avg_power/power.module";
// import { GensetGateway } from "./gateways/genset.gateway";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: true,
      // ssl: true,
      // extra: {
      //   ssl: {
      //     rejectUnauthorized: false,
      //   },
      // },
    }),
    DeviceModule,
    StatusModule,
    GensetModule,
    PowerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}