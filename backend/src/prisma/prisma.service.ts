import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Neon is serverless and sleeps when idle, so the first connection after a
    // cold period can fail (P1001) or take several seconds to wake. Retry with
    // backoff, and if it still won't connect, boot anyway — Prisma connects
    // lazily on the first query, so the API stays up and recovers on its own
    // instead of crash-looping the whole backend.
    const delays = [1000, 2000, 4000, 8000];
    for (let attempt = 0; ; attempt++) {
      try {
        await this.$connect();
        if (attempt > 0) this.logger.log(`Database connected after ${attempt + 1} attempt(s).`);
        return;
      } catch (err) {
        if (attempt >= delays.length) {
          this.logger.warn(
            `Could not connect to the database after ${attempt + 1} attempts; ` +
              'starting anyway and will connect on first query. ' +
              `Last error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
