import axios from 'axios';
import { Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import moment from 'moment';

import { Weather, WeatherDocument } from './weather.schema';
import { WeatherDto } from './weather.dto';
import { handleAxiosError } from 'src/utils/http';
import { queryExprByDate } from 'src/utils/utils';

@Injectable()
export class WeatherService {
  private readonly OPEN_WEATHER_MAP_API_URL: string;
  private readonly OPEN_WEATHER_MAP_API_KEY: string;
  private readonly philadelphiaLatitude = 39.952583;
  private readonly philadelphiaLongitude = -75.165222;

  constructor(
    @InjectModel(Weather.name)
    private readonly weatherModel: Model<WeatherDocument>,
    private readonly env: ConfigService,
    private readonly logger: Logger,
  ) {
    this.OPEN_WEATHER_MAP_API_URL = this.env.get('OPEN_WEATHER_MAP_API_URL');
    this.OPEN_WEATHER_MAP_API_KEY = this.env.get('OPEN_WEATHER_MAP_API_KEY');
  }

  async getAPIWeatherInfo() {
    try {
      const weatherInfo = await this.requestWeatherInfo();

      if (!weatherInfo || Object.keys(weatherInfo).length === 0) {
        throw new Error("Couldn't find weather info");
      }

      return weatherInfo as WeatherDto;
    } catch (err) {
      throw new Error(`Couldn't get weather information: ${err}`);
    }
  }

  private async requestWeatherInfo() {
    try {
      const res = await axios.get('/data/2.5/weather', {
        baseURL: this.OPEN_WEATHER_MAP_API_URL,
        params: {
          lat: this.philadelphiaLatitude,
          lon: this.philadelphiaLongitude,
          appid: this.OPEN_WEATHER_MAP_API_KEY,
          units: 'metric',
        },
      });

      return res.data as any;
    } catch (err) {
      handleAxiosError(err, this.OPEN_WEATHER_MAP_API_URL);
    }
  }

  async storeWeatherInfo(weatherInfo: WeatherDto) {
    const weather = new this.weatherModel(weatherInfo);
    return weather.save();
  }


  async getDBWeatherInfo(atDateTime: Date) {
    // var startDate = moment(atDateTime);
    // var startDate = moment(atDateTime).format("YYYY-MM-DDTHH:mm:ss"); //req.params.startTime = 2016-09-25 00:00:00
    // var endDate = moment(atDateTime).format("YYYY-MM-DDTHH:mm:ss"); //req.params.endTime = 2016-09-25 01:00:00

    let today = atDateTime.toLocaleDateString("fr-CA").split('/').join('-');
    let seconds = atDateTime.getSeconds();
    let minutes = atDateTime.getMinutes();
    let hour = atDateTime.getHours();
    var startDate = {
      '$gte': today + "T" + hour + ":00:00.000Z",
      '$lt': today + "T" + hour + ":59:59.999Z"
    }

    // const weather = await this.weatherModel.find();

    const weather = await this.weatherModel.findOne(
      // queryExprByDate(atDateTime),
      { date: startDate },
      {
        _id: 0,
        __v: 0,
      },
    );
    console.log(weather);

    if (!weather) {
      this.logger.warn(
        `Couldn't get weather information from DB for date: ${atDateTime.toISOString()}`,
      );
    }

    return weather;
  }

  async getDBRangeWeatherInfo(
    fromDateTime: Date,
    toDateTime: Date,
    frequency: string,
  ) {
    let weather;
    if (frequency && frequency === 'daily') {
      weather = await this.findDaily(fromDateTime, toDateTime);
    } else {
      weather = await this.findHourly(fromDateTime, toDateTime);
    }

    if (weather.length === 0) {
      this.logger.warn(
        `Couldn't get weather information from DB for dates: from: ${fromDateTime.toISOString()}, to: ${toDateTime.toISOString()}`,
      );
    }

    return weather as any as WeatherDto[];
  }

  private async findHourly(fromDateTime: Date, toDateTime: Date) {
    return this.weatherModel.find(
      {
        date: { $gte: fromDateTime, $lte: toDateTime },
      },
      {
        _id: 0,
        __v: 0,
      },
    );
  }

  private async findDaily(fromDateTime: Date, toDateTime: Date) {
    return this.weatherModel.aggregate([
      {
        $match: {
          date: { $gte: fromDateTime, $lte: toDateTime },
        },
      },
      {
        $addFields: {
          dayOfMonth: { $dayOfMonth: '$date' },
        },
      },
      {
        $group: {
          _id: '$dayOfMonth',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $unset: ['dayOfMonth', '_id', '__v'],
      },
    ]);
  }
}
