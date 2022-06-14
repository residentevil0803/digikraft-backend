import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WeatherService } from './weather.service';
import { Weather, WeatherSchema } from './weather.schema';

const modelDefinitions = [{ name: Weather.name, schema: WeatherSchema }];

@Module({
  imports: [
    MongooseModule.forFeature(modelDefinitions),
  ],
  providers: [WeatherService, Logger],
  exports: [WeatherService],
})
export class WeatherModule {}
