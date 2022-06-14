import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { WeatherService } from 'src/weather/weather.service';
import { Weather, WeatherDocument } from 'src/weather/weather.schema';
import { WeatherDto } from './weather.dto';
import { queryExprByDate } from 'src/utils/utils';

jest.mock('axios');
jest.mock('src/utils/utils');

describe('weather service', () => {
  let weatherService: WeatherService;
  let mockWeatherModel: Model<WeatherDocument>;
  let mockWeatherModelSave: jest.Mock;
  let mockWeatherModelFindOne: jest.Mock;
  let mockWeatherModelFind: jest.Mock;
  let mockWeatherModelAggregate: jest.Mock;
  let mockConfigService: ConfigService;
  let mockLogger: Logger;
  const openWeatherAPIURLEnv = 'OPEN_WEATHER_MAP_API_URL';
  const openWeatherAPIKeyEnv = 'OPEN_WEATHER_MAP_API_KEY';
  const philadelphiaLatitude = 39.952583;
  const philadelphiaLongitude = -75.165222;
  let mockQueryExprByDate: jest.Mock;

  beforeEach(async () => {
    const weatherModelToken = getModelToken(Weather.name);
    mockWeatherModelSave = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: weatherModelToken,
          useValue: jest.fn().mockImplementation(() => ({
            save: mockWeatherModelSave,
          })),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((envVar: string) => envVar),
          },
        },
        {
          provide: Logger,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    weatherService = moduleRef.get(WeatherService);
    mockWeatherModel = moduleRef.get(weatherModelToken);
    mockWeatherModel.findOne = mockWeatherModelFindOne = jest.fn();
    mockWeatherModel.find = mockWeatherModelFind = jest.fn();
    mockWeatherModel.aggregate = mockWeatherModelAggregate = jest.fn();
    mockConfigService = moduleRef.get(ConfigService);
    mockLogger = moduleRef.get(Logger);
    mockQueryExprByDate = queryExprByDate as jest.Mock;
  });

  test('needed providers injected', () => {
    expect(weatherService).toHaveProperty('weatherModel');
    expect(weatherService).toHaveProperty('env');
    expect(weatherService).toHaveProperty('logger');
  });

  test('service constructed properly', () => {
    expect(mockConfigService.get).toHaveBeenCalledTimes(2);
    expect(mockConfigService.get).toHaveBeenCalledWith(openWeatherAPIURLEnv);
    expect(weatherService).toHaveProperty('OPEN_WEATHER_MAP_API_URL');

    expect(mockConfigService.get).toHaveBeenCalledWith(openWeatherAPIKeyEnv);
    expect(weatherService).toHaveProperty('OPEN_WEATHER_MAP_API_KEY');
  });

  describe('getWeatherInfo', () => {
    test('retrieves weather info from open weather API', async () => {
      const mockWeatherInfo = {
        data: {
          name: 'Some weather name X',
        },
      };

      axios.get = jest.fn().mockResolvedValue(mockWeatherInfo);

      const apiPath = '/data/2.5/weather';
      const apiUrl = mockConfigService.get(openWeatherAPIURLEnv);

      const result = await weatherService.getAPIWeatherInfo();

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(apiPath, {
        baseURL: apiUrl,
        params: {
          lat: philadelphiaLatitude,
          lon: philadelphiaLongitude,
          appid: openWeatherAPIKeyEnv,
          units: 'metric',
        },
      });

      expect(result).toStrictEqual(mockWeatherInfo.data);
    });

    test('throws if empty response from API', async () => {
      const err = new Error("Couldn't find weather info");

      const mockWeatherInfo = {
        data: {},
      };

      axios.get = jest.fn().mockResolvedValue(mockWeatherInfo);

      await weatherService.getAPIWeatherInfo();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Couldn't get weather information: ${err}`,
      );
    });
  });

  test('storeWeatherInfo', async () => {
    const mockWeatherInfo = { name: 'Some weather object' } as WeatherDto;
    weatherService.storeWeatherInfo(mockWeatherInfo);
    expect(mockWeatherModel).toHaveBeenCalledTimes(1);
    expect(mockWeatherModel).toHaveBeenCalledWith(mockWeatherInfo);

    expect(mockWeatherModelSave).toHaveBeenCalledTimes(1);
  });

  describe('getDBWeatherInfo', () => {
    let fakeDate: Date;
    let fakeQuery: object;

    beforeEach(() => {
      fakeDate = new Date();
      fakeQuery = { $expr: { some: 'expr' } };

      mockQueryExprByDate.mockReturnValue(fakeQuery);
    });
    test('calls model.findOne correctly', async () => {
      await weatherService.getDBWeatherInfo(fakeDate);

      expect(mockQueryExprByDate).toHaveBeenCalledTimes(1);
      expect(mockQueryExprByDate).toHaveBeenCalledWith(fakeDate);
      expect(mockWeatherModelFindOne).toHaveBeenCalledTimes(1);
      expect(mockWeatherModelFindOne).toHaveBeenCalledWith(fakeQuery, {
        _id: 0,
        __v: 0,
      });
    });

    test('logs if no weather info found', async () => {
      const noWeather = null;
      mockWeatherModelFindOne.mockResolvedValue(noWeather);

      await weatherService.getDBWeatherInfo(fakeDate);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    test('returns the weather info found', async () => {
      const fakeWeather = { someFakeInfo: 'fake wind metric' };
      mockWeatherModelFindOne.mockResolvedValue(fakeWeather);

      const weather = await weatherService.getDBWeatherInfo(fakeDate);
      expect(weather).toStrictEqual(fakeWeather);
    });
  });

  describe('getDBRangeWeatherInfo', () => {
    let fakeFromDateTime: Date;
    let fakeToDateTime: Date;
    let fakeFrequency: string;
    let fakeWeather: object[];

    beforeEach(() => {
      fakeFromDateTime = new Date();
      fakeToDateTime = new Date();
      fakeFrequency = 'hourly';
      fakeWeather = [{ fakeSnow: 'snowy' }, { fakeRain: 'rainy' }];

      mockWeatherModelAggregate.mockResolvedValue(fakeWeather);
      mockWeatherModelFind.mockResolvedValue(fakeWeather);
    });

    test('finds daily weather information', async () => {
      fakeFrequency = 'daily';
      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      expect(mockWeatherModelAggregate).toHaveBeenCalledTimes(1);
    });

    test('finds hourly information', async () => {
      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      expect(mockWeatherModelFind).toHaveBeenCalledTimes(1);
      mockWeatherModelFind.mockClear();

      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        null,
      );

      expect(mockWeatherModelFind).toHaveBeenCalledTimes(1);
      mockWeatherModelFind.mockClear();

      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        'some-weird-frequency',
      );

      expect(mockWeatherModelFind).toHaveBeenCalledTimes(1);
      mockWeatherModelFind.mockClear();
    });

    test('logs if no weather info found', async () => {
      const emptyWeatherList = [];
      mockWeatherModelAggregate.mockResolvedValue(emptyWeatherList);
      mockWeatherModelFind.mockResolvedValue(emptyWeatherList);

      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      fakeFrequency = 'daily';
      await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    test('returns weather info found', async () => {
      let weather = await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      expect(weather).toStrictEqual(fakeWeather);

      fakeFrequency = 'daily';
      weather = await weatherService.getDBRangeWeatherInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeFrequency,
      );

      expect(weather).toStrictEqual(fakeWeather);
    });
  });
});
