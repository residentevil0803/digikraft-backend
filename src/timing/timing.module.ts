import { Module, Logger } from '@nestjs/common';

import { TimingService } from './timing.service';

@Module({
  providers: [TimingService, Logger],
  exports: [TimingService],
})
export class TimingModule { }
