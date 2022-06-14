import { Test } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';
import { DBUri } from './config.service';

describe('DBUri service', () => {
  let dbUri: DBUri;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [DBUri] })
      .useMocker((token) => {
        if (token === ConfigService) {
          return {
            get: (envVariable: string) => envVariable,
          };
        }
      })
      .compile();

    dbUri = moduleRef.get(DBUri);
  });

  test('should build database uri', () => {
    const expectedUri =
      'mongodb+srv://MONGODB_USERNAME:MONGODB_PASSWORD@MONGODB_HOST/MONGODB_DBNAME';

    expect(dbUri.uri).toBe(expectedUri);
  });
});
