import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogCacheService } from './catalog-cache.service';
import { LessonReaderService } from './lesson-reader.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogCacheService,
    LessonReaderService,
  ],
  exports: [
    CatalogService,
    CatalogCacheService,
    LessonReaderService,
  ],
})
export class CatalogModule {}
