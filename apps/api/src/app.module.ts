import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, CatalogModule, QuizzesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

