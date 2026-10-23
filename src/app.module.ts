import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './shared/infra/config/config.module';
import { DatabaseModule } from './shared/infra/db/database.module';
import { HashModule } from './shared/application/hash.module';
import { PlanModule } from './plans/plans.module';
import { ApiKeyLoggerMiddleware } from './shared/middlewares/apiKeyLogger.middleware';
import { RateLimitModule } from './shared/infra/security/rate-limit.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { StockModule } from './stock/stock.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';
import { ClinicScheduleModule } from './clinic-schedule/clinic-schedule.module';
import { XRayAnalysisModule } from './x-ray-analysis/x-ray-analysis.module';
import { ClinicSettingsModule } from './clinic-settings/clinic-settings.module';
import { CommunicationsModule } from './communications/communications.module';
import { ValidateNifModule } from './validate-nif/validate-nif.module';
import { DocumentsModule } from './documents/documents.module';
import { FinancesModule } from './finances/finances.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HashModule,
    DatabaseModule,
    PlanModule,
    RateLimitModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    ChatModule,
    UsersModule,
    StockModule,
    TreatmentPlansModule,
    ClinicScheduleModule,
    XRayAnalysisModule,
    ClinicSettingsModule,
    CommunicationsModule,
    ValidateNifModule,
    DocumentsModule,
    FinancesModule,
    ScheduleModule.forRoot(),
    SubscriptionsModule,
    PlatformAdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyLoggerMiddleware).forRoutes('*');
  }
}
