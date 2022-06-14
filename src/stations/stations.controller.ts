import {
  Controller,
  Get,
  HttpException,
  Query,
  Param,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';

import { StationsService } from './stations.service';
import { parseDate } from 'src/utils/utils';
import { WeatherService } from 'src/weather/weather.service';

@Controller('api/v1/stations')
export class StationsController {
  constructor(
    private readonly stationsService: StationsService,
    private readonly weatherService: WeatherService,
  ) { }

  @Get()
  async allStations(@Query('at') at: string) {

    const atDateTime = parseDate(at);
    console.log(atDateTime);

    const weather = await this.weatherService.getDBWeatherInfo(atDateTime);

    const stations = await this.stationsService.getDBStationsInfo(atDateTime);

    if (!weather && stations.length === 0) {
      throw new HttpException(
        `Couldn't find information for date: ${at}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      at: stations[0].date.toISOString(),
      weather: weather,
      stations: stations,
    };
  }

  @Get(':kioskId')
  async specificStation(
    @Param('kioskId', ParseIntPipe) kioskId: number,
    @Query('at') at: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('frequency') frequency: string,
  ) {
    if (at) {
      return this.oneSnapshot(kioskId, at);
    } else if (from && to) {
      return this.multipleSnapshots(kioskId, from, to, frequency);
    } else {
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }

  async oneSnapshot(kioskId: number, at: string) {
    const atDateTime = parseDate(at);


    const weather = await this.weatherService.getDBWeatherInfo(atDateTime);
    const station = await this.stationsService.getDBStationInfo(
      atDateTime,
      kioskId,
    );

    if (!station) {
      throw new HttpException(
        `Couldn't find information for date: ${at}, kioskId: ${kioskId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      at: station.date.toISOString(),
      weather: weather,
      station: station,
    };
  }

  async multipleSnapshots(
    kioskId: number,
    from: string,
    to: string,
    frequency: string,
  ) {
    const fromDateTime = parseDate(from);
    const toDateTime = parseDate(to);

    if (frequency && frequency !== 'daily' && frequency !== 'hourly') {
      throw new HttpException(
        `Invalid frequency: ${frequency}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const weather = await this.weatherService.getDBRangeWeatherInfo(
      fromDateTime,
      toDateTime,
      frequency,
    );
    const stations = await this.stationsService.getDBRangeStationInfo(
      fromDateTime,
      toDateTime,
      kioskId,
      frequency,
    );

    if (stations.length === 0) {
      throw new HttpException(
        `Couldn't find information for dates: from ${fromDateTime}, to: ${toDateTime}, kioskId: ${kioskId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      at: stations[0].date.toISOString(),
      weather: weather,
      stations: stations,
    };
  }
}
