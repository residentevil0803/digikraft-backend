import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { StationsService } from 'src/stations/stations.service';
import { WeatherService } from 'src/weather/weather.service';
import { TimingService } from 'src/timing/timing.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly stationsService: StationsService,
    private readonly weatherService: WeatherService,
    private readonly timingService: TimingService,
    private readonly logger: Logger,
  ) { }

  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'America/New_York' })
  async updateStationsAndWeatherInfo() {
    this.logger.log('Updating stations and weather info');

    const currentDate = new Date();

    try {
      // TODO: Consider using Promise.all
      await this.timingService.measure(
        this.updateStationsInfo,
        this,
        currentDate,
      );
      await this.timingService.measure(
        this.updateWeatherInfo,
        this,
        currentDate,
      );
    } catch (err) {
      this.logger.error(`Problem updating information: ${err}`);
    }
  }

  async updateStationsInfo(date: Date) {
    const stations = await this.stationsService.getAPIStationsInfo();

    const processedStations = stations.map((station) => ({
      date: date,
      ...station
    }));

    return this.stationsService.storeStationsInfo(processedStations);
  }

  async updateWeatherInfo(date: Date) {
    const weatherInfo = await this.weatherService.getAPIWeatherInfo();
    const newWeatherInfo = { date: date, ...weatherInfo };
    return this.weatherService.storeWeatherInfo(newWeatherInfo);
  }
}
