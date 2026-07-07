import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import { engine } from 'express-handlebars';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setViewEngine('hbs');
  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.use(express.static(join(process.cwd(), 'public')));
  app.use('/css', express.static(join(process.cwd(), 'public', 'css')));
  app.use('/js', express.static(join(process.cwd(), 'public', 'js')));
  app.engine(
    'hbs',
    engine({
      extname: 'hbs',
      defaultLayout: false,
    }),
  );

  await app.listen(3000);
}

bootstrap();
