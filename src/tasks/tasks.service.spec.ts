import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { StationsService } from 'src/stations/stations.service';
import { WeatherService } from 'src/weather/weather.service';
import { TimingService } from 'src/timing/timing.service';

describe('tasks service', () => {
  let tasksService: TasksService;
  let mockStationsService: StationsService;
  let mockWeatherService: WeatherService;
  let mockTimingService: TimingService;
  let mockLogger: Logger;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: StationsService,
          useValue: {
            getStationsInfo: jest.fn(),
            storeStationsInfo: jest.fn(),
          },
        },
        {
          provide: WeatherService,
          useValue: {
            getWeatherInfo: jest.fn(),
            storeWeatherInfo: jest.fn(),
          },
        },
        {
          provide: TimingService,
          useValue: {
            measure: jest.fn().mockImplementation((fn: Function, self) => {
              fn.call(self);
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    tasksService = moduleRef.get(TasksService);
    mockStationsService = moduleRef.get(StationsService);
    mockWeatherService = moduleRef.get(WeatherService);
    mockTimingService = moduleRef.get(TimingService);
    mockLogger = moduleRef.get(Logger);
  });

  test('updateStationsAndWeatherInfo', async () => {
    tasksService.updateStationsInfo = jest.fn();
    tasksService.updateWeatherInfo = jest.fn();

    await tasksService.updateStationsAndWeatherInfo();

    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    expect(mockTimingService.measure).toHaveBeenCalledTimes(2);
    expect(tasksService.updateStationsInfo).toHaveBeenCalledTimes(1);
    expect(tasksService.updateWeatherInfo).toHaveBeenCalledTimes(1);
  });

  test('updateStationsInfo', async () => {
    const mockCurrentDate = new Date();
    const mockStationsInfo = [
      { name: 'Mock Station 1' },
      { name: 'Mock Station 2' },
    ];
    mockStationsService.getAPIStationsInfo = jest
      .fn()
      .mockResolvedValue(mockStationsInfo);

    await tasksService.updateStationsInfo(mockCurrentDate);

    expect(mockStationsService.getAPIStationsInfo).toHaveBeenCalledTimes(1);
    expect(mockStationsService.storeStationsInfo).toHaveBeenCalledTimes(1);
    expect(mockStationsService.storeStationsInfo).toHaveBeenCalledWith(
      mockStationsInfo.map((station) => ({
        date: mockCurrentDate,
        ...station,
      })),
    );
  });

  test('updateWeatherInfo', async () => {
    const mockCurrentDate = new Date();
    const mockWeatherInfo = { name: 'Some Weather Info' };
    mockWeatherService.getAPIWeatherInfo = jest
      .fn()
      .mockResolvedValue(mockWeatherInfo);

    await tasksService.updateWeatherInfo(mockCurrentDate);

    expect(mockWeatherService.getAPIWeatherInfo).toHaveBeenCalledTimes(1);
    expect(mockWeatherService.storeWeatherInfo).toHaveBeenCalledTimes(1);
    expect(mockWeatherService.storeWeatherInfo).toHaveBeenCalledWith({
      date: mockCurrentDate,
      ...mockWeatherInfo,
    });
  });
});
