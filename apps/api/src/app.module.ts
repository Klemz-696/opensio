import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ProgressModule } from './modules/progress/progress.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LabsModule } from './modules/labs/labs.module';
import { TerminalModule } from './modules/terminal/terminal.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SingleUserMiddleware } from './common/middleware/single-user.middleware';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    ProfileModule,
    CatalogModule,
    QuizzesModule,
    ProgressModule,
    DashboardModule,
    LabsModule,
    TerminalModule,
    AiModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SingleUserMiddleware).forRoutes('*');
  }
}


