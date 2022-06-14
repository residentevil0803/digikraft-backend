import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TimingService {
  constructor(private readonly logger: Logger) { }

  measure(f: Function, self: any, ...args: any[]) {
    const startTime = process.uptime();
    const result = f.call(self, ...args);
    const functionName = f.name;

    if (result instanceof Promise) {
      result.then(() => {
        this.logTime(functionName, startTime);
      });
    } else {
      this.logTime(functionName, startTime);
    }

    return result;
  }

  private logTime(functionName: string, startTime: number) {
    const endTime = process.uptime();
    this.logger.debug(`${functionName} took: ${endTime - startTime}s`);
  }
}
