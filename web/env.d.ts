import type {
  D1Database,
  DurableObjectNamespace,
  Fetcher,
  KVNamespace,
  R2Bucket,
} from "@cloudflare/workers-types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLOUDTD_USER_STACK_MAP: KVNamespace;
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_EC2_KEY: string;
    }
  }
}
