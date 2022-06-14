import { Module, Logger } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { TasksService } from './tasks.service';
import { StationsModule } from 'src/stations/stations.module';
import { WeatherModule } from 'src/weather/weather.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    StationsModule,
    WeatherModule,
    SharedModule,
    ScheduleModule.forRoot(),
  ],
  providers: [TasksService, Logger],
})
export class TasksModule {}
