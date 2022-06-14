import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { StationsService } from './stations.service';
import { Station, StationSchema } from './station.schema';
import { StationsController } from './stations.controller';
import { WeatherModule } from 'src/weather/weather.module';

const modelDefinitions = [{ name: Station.name, schema: StationSchema }];

@Module({
  imports: [MongooseModule.forFeature(modelDefinitions), WeatherModule],
  providers: [StationsService, Logger],
  controllers: [StationsController],
  exports: [StationsService],
})
export class StationsModule {}
