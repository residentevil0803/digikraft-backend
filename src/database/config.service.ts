import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DBUri {
  public readonly uri: string;

  constructor(private readonly env: ConfigService) {
    const username = this.env.get('MONGODB_USERNAME');
    const password = this.env.get('MONGODB_PASSWORD');
    const host = this.env.get('MONGODB_HOST');
    const dbname = this.env.get('MONGODB_DBNAME');

    // this.uri = `mongodb+srv://${username}:${password}@${host}/${dbname}?retryWrites=true&w=majority`;
    this.uri = "mongodb://localhost:27017/digikraft";
  }
}
