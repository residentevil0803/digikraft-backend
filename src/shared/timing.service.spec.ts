import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { TimingService } from './timing.service';

describe('timing service', () => {
  let timingService: TimingService;
  let loggerMock: Logger;
  let processUptimeMock: jest.Mock;
  let functionToMeasure: jest.Mock;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TimingService,
        {
          provide: Logger,
          useValue: { debug: jest.fn() },
        },
      ],
    }).compile();

    timingService = moduleRef.get(TimingService);
    loggerMock = moduleRef.get(Logger);
    processUptimeMock = process.uptime = jest.fn();
    functionToMeasure = jest.fn();
  });

  test('logger injected', () => {
    expect(timingService).toHaveProperty('logger');
  });

  test('debug logger called', () => {
    timingService.measure(() => {}, {});
    expect(loggerMock.debug).toHaveBeenCalled();
  });

  test('measure time using process.uptime', () => {
    timingService.measure(() => {}, {});
    expect(processUptimeMock).toHaveBeenCalledTimes(2);
  });

  test('given function called', () => {
    timingService.measure(functionToMeasure, {});
    expect(functionToMeasure).toHaveBeenCalledTimes(1);
  });

  test('given function called with given object as this', () => {
    const fakeThis = { fakeProp: 'fakeValue' };
    const callSpy = jest.spyOn(functionToMeasure, 'call');
    timingService.measure(functionToMeasure, fakeThis);

    expect(callSpy).toHaveBeenCalledWith(fakeThis);
  });

  test('given function called with given args', () => {
    const fakeThis = { fakeProp: 'fakeValue' };
    const fakeArgs = [1, 'a', { b: 'c' }];
    timingService.measure(functionToMeasure, fakeThis, fakeArgs);

    expect(functionToMeasure).toHaveBeenCalledWith(fakeArgs);
  });

  test('the returned value is the value returned by the given function', () => {
    const fakeResult = { fakeProp: 'fakeValue' };
    const fakePromise = Promise.resolve(fakeResult);
    functionToMeasure = jest.fn().mockImplementation(() => fakePromise);

    let result = timingService.measure(functionToMeasure, {});
    expect(result).toBe(fakePromise);

    functionToMeasure = jest.fn().mockImplementation(() => fakeResult);
    result = timingService.measure(functionToMeasure, {});
    expect(result).toBe(fakeResult);
  });

  test('properly measure function if result is a promise', async () => {
    const fakeResult = { fakeProp: 'fakeValue' };
    const fakePromise = Promise.resolve(fakeResult);
    functionToMeasure = jest.fn().mockImplementation(() => fakePromise);

    const spy = jest.spyOn(fakePromise, 'then');

    await timingService.measure(functionToMeasure, {});
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
