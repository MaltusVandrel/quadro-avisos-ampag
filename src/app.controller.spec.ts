import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the main page data', () => {
    const controller = new AppController();

    expect(controller.getHome()).toEqual({
      title: 'Quadro de Avisos',
    });
  });
});
