import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogCacheService } from './catalog-cache.service';
import { LessonReaderService } from './lesson-reader.service';

import { CatalogProgressEnricherService } from './catalog-progress-enricher.service';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [PrismaModule, AuthModule, ProgressModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogCacheService,
    LessonReaderService,
    CatalogProgressEnricherService,
  ],
  exports: [
    CatalogService,
    CatalogCacheService,
    LessonReaderService,
    CatalogProgressEnricherService,
  ],
})
export class CatalogModule {}
