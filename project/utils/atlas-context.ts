import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createEngine } from './engine/engine';
import {
  parseAtlasWorkbookFromBuffer,
  parseAtlasWorkbookFromFile,
} from './parser/parser';
import type { AtlasData, PlanResult } from './types';
import type { Operation } from './commits/commits';

export type AtlasContextKind = 'default' | 'upload';

export interface AtlasContextSource {
  kind: AtlasContextKind;
  label: string;
  fileName?: string;
  createdAt: string;
}

export interface AtlasContext {
  contextId: string;
  data: AtlasData;
  plan: PlanResult;
  operations: Operation[];
  source: AtlasContextSource;
}

const DEFAULT_CONTEXT_ID = 'default-workbook';
const DEFAULT_WORKBOOK_PATH = path.join(
  process.cwd(),
  'public',
  'Atlas_Fresh_Production_Commercial_Data.xlsx'
);

const globalForAtlas = globalThis as typeof globalThis & {
  __atlasContexts?: Map<string, AtlasContext>;
  __atlasDefaultContext?: AtlasContext | null;
};

const atlasContexts = globalForAtlas.__atlasContexts ?? new Map<string, AtlasContext>();
globalForAtlas.__atlasContexts = atlasContexts;

let defaultContextCache = globalForAtlas.__atlasDefaultContext ?? null;
globalForAtlas.__atlasDefaultContext = defaultContextCache;

function buildContext(
  data: AtlasData,
  source: AtlasContextSource,
  contextId?: string
): AtlasContext {
  const resolvedContextId = contextId ?? randomUUID();
  const engine = createEngine(data);
  const plan = engine.plan();
  const operations = engine.getOperation();

  return {
    contextId: resolvedContextId,
    data,
    plan,
    operations,
    source,
  };
}

export function storeAtlasContextFromData(
  data: AtlasData,
  source: AtlasContextSource,
  contextId?: string
): AtlasContext {
  const context = buildContext(data, source, contextId);
  atlasContexts.set(context.contextId, context);
  return context;
}

export function storeAtlasContextFromBuffer(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  source: AtlasContextSource
): AtlasContext {
  const data = parseAtlasWorkbookFromBuffer(buffer);
  return storeAtlasContextFromData(data, source);
}

export function storeAtlasContextFromFile(
  filePath: string,
  source: AtlasContextSource,
  contextId?: string
): AtlasContext {
  const data = parseAtlasWorkbookFromFile(filePath);
  return storeAtlasContextFromData(data, source, contextId);
}

export async function getDefaultAtlasContext(): Promise<AtlasContext> {
  if (defaultContextCache) return defaultContextCache;

  const context = storeAtlasContextFromFile(DEFAULT_WORKBOOK_PATH, {
    kind: 'default',
    label: 'Preloaded workbook',
    fileName: path.basename(DEFAULT_WORKBOOK_PATH),
    createdAt: new Date().toISOString(),
  }, DEFAULT_CONTEXT_ID);

  defaultContextCache = context;
  atlasContexts.set(DEFAULT_CONTEXT_ID, context);
  globalForAtlas.__atlasDefaultContext = context;
  return context;
}

export async function getAtlasContext(contextId?: string | null): Promise<AtlasContext> {
  if (contextId) {
    if (contextId === DEFAULT_CONTEXT_ID) {
      return getDefaultAtlasContext();
    }

    const stored = atlasContexts.get(contextId);
    if (!stored) {
      throw new Error(`Unknown data context: ${contextId}`);
    }
    return stored;
  }

  return getDefaultAtlasContext();
}

export async function getAtlasPlan(contextId?: string | null): Promise<AtlasContext> {
  return getAtlasContext(contextId);
}

export function rememberAtlasContext(context: AtlasContext): AtlasContext {
  atlasContexts.set(context.contextId, context);
  return context;
}

export function createUploadSource(fileName: string): AtlasContextSource {
  return {
    kind: 'upload',
    label: 'Uploaded workbook',
    fileName,
    createdAt: new Date().toISOString(),
  };
}

export function createDefaultSource(): AtlasContextSource {
  return {
    kind: 'default',
    label: 'Preloaded workbook',
    fileName: path.basename(DEFAULT_WORKBOOK_PATH),
    createdAt: new Date().toISOString(),
  };
}

export { DEFAULT_CONTEXT_ID, DEFAULT_WORKBOOK_PATH };
