import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('home')
  getHome() {
    const isProduction = process.env.NODE_ENV === 'production';
    const envKey = isProduction
      ? 'GOOGLE_MAPS_API_KEY_PROD'
      : 'GOOGLE_MAPS_API_KEY_DEV';
    const googleMapsApiKey = process.env[envKey];

    if (!googleMapsApiKey) {
      throw new Error(
        `${envKey} is not defined. Please set it in your .env file.`,
      );
    }

    return {
      title: 'Quadro de Avisos',
      googleMapsApiKey,
    };
  }
}
