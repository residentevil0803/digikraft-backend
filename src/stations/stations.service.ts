import axios from 'axios';
import { Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { Station, StationDocument } from './station.schema';
import { StationDto } from './station.dto';
import { handleAxiosError } from 'src/utils/http';
import { queryExprByDate } from 'src/utils/utils';

@Injectable()
export class StationsService {
  private readonly INDEGO_API_URL: string;

  constructor(
    @InjectModel(Station.name)
    private readonly stationModel: Model<StationDocument>,
    private readonly env: ConfigService,
    private readonly logger: Logger,
  ) {
    this.INDEGO_API_URL = this.env.get('INDEGO_API_URL');
  }

  async getAPIStationsInfo() {
    try {
      const stationsInfo = await this.requestStationsInfo();

      if (!stationsInfo || stationsInfo.length === 0) {
        throw new Error("Couldn't find any station");
      }

      return stationsInfo.map(
        (stationInfo) => stationInfo.properties as StationDto,
      );
    } catch (err) {
      throw new Error(`Couldn't get stations information from API: ${err}`);
    }
  }

  private async requestStationsInfo() {
    try {
      const res = await axios.get(this.INDEGO_API_URL);
      return res.data?.features as any[];
    } catch (err) {
      handleAxiosError(err, this.INDEGO_API_URL);
    }
  }

  async storeStationsInfo(stationsInfo: StationDto[]) {
    return this.stationModel.insertMany(stationsInfo);
  }

  async getDBStationsInfo(atDateTime: Date) {
    const stations = await this.stationModel.find(queryExprByDate(atDateTime), {
      _id: 0,
      __v: 0,
    });

    if (stations.length === 0) {
      this.logger.warn(
        `Couldn't get any stations from DB for date: ${atDateTime.toISOString()}`,
      );
    }

    return stations as StationDto[];
  }

  async getDBStationInfo(atDateTime: Date, kioskId: number) {
    const query = queryExprByDate(atDateTime);
    query['$expr']['$and'].push({ $eq: ['$kioskId', kioskId] });

    const station = await this.stationModel.findOne(query, {
      _id: 0,
      __v: 0,
    });

    if (!station) {
      this.logger.warn(
        `Couldn't find station in DB for date: ${atDateTime.toISOString()}, kioskId: ${kioskId}`,
      );
    }

    return station as StationDto;
  }

  async getDBRangeStationInfo(
    fromDateTime: Date,
    toDateTime: Date,
    kioskId: number,
    frequency: string,
  ) {
    let stations;

    if (frequency && frequency === 'daily') {
      stations = await this.findDaily(fromDateTime, toDateTime, kioskId);
    } else {
      stations = await this.findHourly(fromDateTime, toDateTime, kioskId);
    }

    if (stations.length === 0) {
      this.logger.warn(
        `Couldn't get stations information from DB for dates: from: ${fromDateTime.toISOString()}, to: ${toDateTime.toISOString()}, kioskId: ${kioskId}`,
      );
    }

    return stations as StationDto[];
  }

  private async findHourly(
    fromDateTime: Date,
    toDateTime: Date,
    kioskId: number,
  ) {
    return this.stationModel.find(
      {
        kioskId: kioskId,
        date: { $gte: fromDateTime, $lte: toDateTime },
      },
      {
        _id: 0,
        __v: 0,
      },
    );
  }

  private async findDaily(
    fromDateTime: Date,
    toDateTime: Date,
    kioskId: number,
  ) {
    return this.stationModel.aggregate([
      {
        $match: {
          kioskId: kioskId,
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
