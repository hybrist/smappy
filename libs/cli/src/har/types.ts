export interface HarContent {
  text?: string;
  size?: number;
  compression?: number;
  mimeType?: string;
  encoding?: string;
}

export interface HarResponse {
  status: number;
  content: HarContent;
  headers?: Array<{ name: string; value: string }>;
}

export interface HarRequest {
  url: string;
  method: string;
  headers?: Array<{ name: string; value: string }>;
}

export interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
}

export interface HarPage {
  id: string;
  title?: string;
  comment?: string;
}

export interface HarLog {
  version: string;
  creator?: { name: string; version: string };
  pages?: HarPage[];
  entries: HarEntry[];
}

export interface HarFile {
  log: HarLog;
}

export interface ScriptResource {
  url: string;
  mimeType?: string;
  body: string;
  bytes: number;
  pageRef?: string;
}

export type HarWarningType =
  | 'missing-content'
  | 'parse-error'
  | 'empty-log'
  | 'filter';

export interface HarWarning {
  type: HarWarningType;
  message: string;
  url?: string;
  details?: string;
}
