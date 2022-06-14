import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { StationsModule } from './stations/stations.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    DatabaseModule,
    StationsModule,
    TasksModule,
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
})
export class AppModule {}
