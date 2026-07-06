import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('home')
  getHome() {
    return { title: 'Quadro de Avisos' };
  }
}
