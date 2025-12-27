import { ISearchableRepository } from "../../shared/domain/repository/repository-interface";
import { SearchParams } from "../../shared/domain/repository/search-params";
import { SearchResult } from "../../shared/domain/repository/search-result";
import { Logs, LogsId } from "./log.aggregate";

export type LogsFilter = string;

export class LogsSearchParams extends SearchParams<LogsFilter> {}

export class LogsSearchResult extends SearchResult {}

export interface ILogsRepository 
extends ISearchableRepository<
  Logs,
  LogsId,
  LogsSearchResult,
  LogsSearchParams
>{
  filterByNotificationIdAndTimestamp(notificationId: string, timestamp?: Date): Promise<Logs[] | null>;
  logsByApplicationIdAndTimestamp(applicationId: string, timestamp?: Date): Promise<Logs[] | null>;
}