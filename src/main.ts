import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { StatusUpdateService } from "./status/route.service";
import { WsAdapter } from "@nestjs/platform-ws";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(5070);

  // const statusUpdateService = app.get(StatusUpdateService);
  // setInterval(() => statusUpdateService.fetchAndUpdateStatus(), 5000);
}

bootstrap();