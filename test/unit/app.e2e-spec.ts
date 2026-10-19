import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('API documentation (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('documents domain routes and protects them with JWT', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Industrial Control API')
        .setVersion('1.0.0')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'access-token',
        )
        .build(),
    );

    expect(document.paths).toHaveProperty('/products');
    expect(document.paths).toHaveProperty('/customers');
    expect(document.paths).toHaveProperty('/stock/entries');
    expect(document.paths).toHaveProperty('/orders');
    expect(document.paths).toHaveProperty('/logistics/orders');

    return request(app.getHttpServer()).get('/products').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
