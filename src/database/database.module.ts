import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DBUri } from './config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [DatabaseModule],
      useFactory: (dbUri: DBUri) => ({
        uri: dbUri.uri,
        retryWrites: true,
        w: 'majority',
      }),
      inject: [DBUri],
    }),
  ],
  providers: [DBUri],
  exports: [DBUri],
})
export class DatabaseModule {}
