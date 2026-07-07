import { AppController } from './app.controller';

describe('AppController', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns the main page data with dev key by default', () => {
    process.env.GOOGLE_MAPS_API_KEY_DEV = 'dev-key';
    delete process.env.NODE_ENV;

    const controller = new AppController();

    expect(controller.getHome()).toEqual({
      title: 'Quadro de Avisos',
      googleMapsApiKey: 'dev-key',
    });
  });

  it('returns the main page data with prod key in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_MAPS_API_KEY_PROD = 'prod-key';

    const controller = new AppController();

    expect(controller.getHome()).toEqual({
      title: 'Quadro de Avisos',
      googleMapsApiKey: 'prod-key',
    });
  });

  it('throws when the required API key is missing', () => {
    delete process.env.GOOGLE_MAPS_API_KEY_DEV;
    delete process.env.NODE_ENV;

    const controller = new AppController();

    expect(() => controller.getHome()).toThrow(
      'GOOGLE_MAPS_API_KEY_DEV is not defined',
    );
  });
});
