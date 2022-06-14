import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import axios from 'axios';

import { StationsService } from './stations.service';
import { Station } from './station.schema';
import { StationDto } from './station.dto';
import { queryExprByDate } from 'src/utils/utils';

jest.mock('axios');
jest.mock('src/utils/utils');

describe('stations service', () => {
  let stationsService: StationsService;
  let mockStationModelInsertMany: jest.Mock;
  let mockStationModelFind: jest.Mock;
  let mockStationModelFindOne: jest.Mock;
  let mockStationModelAggregate: jest.Mock;
  let mockConfigService: ConfigService;
  let mockLogger: Logger;
  let mockIndegoAPIURLEnv: string;
  let mockQueryExprByDate: jest.Mock;

  beforeEach(async () => {
    mockStationModelInsertMany = jest.fn();
    mockStationModelFind = jest.fn();
    mockStationModelFindOne = jest.fn();
    mockStationModelAggregate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StationsService,
        {
          provide: getModelToken(Station.name),
          useValue: {
            insertMany: mockStationModelInsertMany,
            find: mockStationModelFind,
            findOne: mockStationModelFindOne,
            aggregate: mockStationModelAggregate,
          },
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

    stationsService = moduleRef.get(StationsService);
    mockConfigService = moduleRef.get(ConfigService);
    mockLogger = moduleRef.get(Logger);
    mockIndegoAPIURLEnv = 'INDEGO_API_URL';
    mockQueryExprByDate = queryExprByDate as jest.Mock;
  });

  test('needed providers injected', () => {
    expect(stationsService).toHaveProperty('stationModel');
    expect(stationsService).toHaveProperty('env');
    expect(stationsService).toHaveProperty('logger');
  });

  test('service constructed properly', () => {
    expect(mockConfigService.get).toHaveBeenCalledTimes(1);
    expect(mockConfigService.get).toHaveBeenCalledWith(mockIndegoAPIURLEnv);
    expect(stationsService).toHaveProperty('INDEGO_API_URL');
  });

  describe('getAPIStationsInfo', () => {
    test('retrieves stations from indego API', async () => {
      const mockStations = {
        data: {
          features: [{ properties: { name: '3rd St. Station' } }],
        },
      };

      axios.get = jest.fn().mockResolvedValue(mockStations);
      const apiURL = mockConfigService.get(mockIndegoAPIURLEnv);

      const result = await stationsService.getAPIStationsInfo();

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(apiURL);
      expect(result).toStrictEqual(
        mockStations.data.features.map((station) => station.properties),
      );
    });

    test('throws if empty response from API', async () => {
      let mockStations = {
        data: {},
      };
      const mockErr = "Couldn't find any station";

      axios.get = jest.fn().mockResolvedValue(mockStations);

      await stationsService.getAPIStationsInfo();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Couldn't get stations information from API: Error: ${mockErr}`,
      );

      mockStations = {
        data: { features: [] },
      };

      axios.get = jest.fn().mockResolvedValue(mockStations);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Couldn't get stations information from API: Error: ${mockErr}`,
      );
    });
  });

  test('storeStationsInfo', async () => {
    const mockStationsInfo = [
      { name: '3rd St. Station' },
      { name: '2nd St. Station' },
    ] as StationDto[];
    await stationsService.storeStationsInfo(mockStationsInfo);

    expect(mockStationModelInsertMany).toHaveBeenCalledTimes(1);
    expect(mockStationModelInsertMany).toHaveBeenCalledWith(mockStationsInfo);
  });

  describe('getDBStationsInfo', () => {
    let fakeDate: Date;
    let fakeQuery: object;
    let fakeStations: object[];

    beforeEach(() => {
      fakeDate = new Date();
      fakeQuery = { $expr: { some: 'expr' } };
      fakeStations = [{ name: 'Some Station 1' }, { name: 'Another One' }];

      mockQueryExprByDate.mockReset();
      mockQueryExprByDate.mockReturnValue(fakeQuery);
      mockStationModelFind.mockResolvedValue(fakeStations);
    });

    test('calls model.find correctly', async () => {
      await stationsService.getDBStationsInfo(fakeDate);

      expect(mockQueryExprByDate).toHaveBeenCalledTimes(1);
      expect(mockQueryExprByDate).toHaveBeenCalledWith(fakeDate);
      expect(mockStationModelFind).toHaveBeenCalledTimes(1);
      expect(mockStationModelFind).toHaveBeenCalledWith(fakeQuery, {
        _id: 0,
        __v: 0,
      });
    });

    test('logs if no station found', async () => {
      const emptyStationsList = [];
      mockStationModelFind.mockResolvedValue(emptyStationsList);

      await stationsService.getDBStationsInfo(fakeDate);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    test('returns found stations', async () => {
      const stations = await stationsService.getDBStationsInfo(fakeDate);
      expect(stations).toStrictEqual(fakeStations);
    });
  });

  describe('getDBStationInfo', () => {
    let fakeDate: Date;
    let fakeKioskId: number;
    let fakeQuery: object;
    let fakeStation: object;

    beforeEach(() => {
      fakeDate = new Date();
      fakeKioskId = 1111;
      fakeQuery = { $expr: { $and: [] } };
      fakeStation = { name: 'Some Station 1' };

      mockQueryExprByDate.mockReset();
      mockQueryExprByDate.mockReturnValue(fakeQuery);
      mockStationModelFindOne.mockResolvedValue(fakeStation);
    });

    test('calls model.findOne correctly', async () => {
      await stationsService.getDBStationInfo(fakeDate, fakeKioskId);

      expect(mockQueryExprByDate).toHaveBeenCalledTimes(1);
      expect(mockQueryExprByDate).toHaveBeenCalledWith(fakeDate);

      expect(mockStationModelFindOne).toHaveBeenCalledTimes(1);

      const modifiedQuery = mockStationModelFindOne.mock.calls[0][0];
      const andOperator = modifiedQuery.$expr.$and as object[];
      expect(andOperator[andOperator.length - 1]).toStrictEqual({
        $eq: ['$kioskId', fakeKioskId],
      });
      expect(mockStationModelFindOne).toHaveBeenCalledWith(modifiedQuery, {
        _id: 0,
        __v: 0,
      });
    });

    test('logs if no station found', async () => {
      const noStation = null;
      mockStationModelFindOne.mockResolvedValue(noStation);
      await stationsService.getDBStationInfo(fakeDate, fakeKioskId);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });

    test('resturns found station', async () => {
      const station = await stationsService.getDBStationInfo(
        fakeDate,
        fakeKioskId,
      );

      expect(station).toStrictEqual(fakeStation);
    });
  });
  describe('getDBRangeStationInfo', () => {
    let fakeFromDateTime: Date;
    let fakeToDateTime: Date;
    let fakeKioskId: number;
    let fakeFrequency: string;
    let fakeStations: object[];

    beforeEach(() => {
      fakeFromDateTime = new Date();
      fakeToDateTime = new Date();
      fakeKioskId = 1111;
      fakeFrequency = 'hourly';
      fakeStations = [{ name: 'Some Station 1' }, { name: 'Another One' }];

      mockStationModelAggregate.mockResolvedValue(fakeStations);
      mockStationModelFind.mockResolvedValue(fakeStations);
    });

    test('finds daily stations information', async () => {
      fakeFrequency = 'daily';
      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      expect(mockStationModelAggregate).toHaveBeenCalledTimes(1);
    });

    test('finds hourly stations information', async () => {
      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      expect(mockStationModelFind).toHaveBeenCalledTimes(1);
      mockStationModelFind.mockClear();

      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        null,
      );

      expect(mockStationModelFind).toHaveBeenCalledTimes(1);
      mockStationModelFind.mockClear();

      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        'some-weird-frequency',
      );

      expect(mockStationModelFind).toHaveBeenCalledTimes(1);
      mockStationModelFind.mockClear();
    });

    test('logs if no station found', async () => {
      const emptyStationsList = [];
      mockStationModelAggregate.mockResolvedValue(emptyStationsList);
      mockStationModelFind.mockResolvedValue(emptyStationsList);

      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      fakeFrequency = 'daily';
      await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    test('returns found stations', async () => {
      let stations = await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      expect(stations).toStrictEqual(fakeStations);

      fakeFrequency = 'daily';
      stations = await stationsService.getDBRangeStationInfo(
        fakeFromDateTime,
        fakeToDateTime,
        fakeKioskId,
        fakeFrequency,
      );

      expect(stations).toStrictEqual(fakeStations);
    });
  });
});
