import * as XLSX from 'xlsx';
import {
  AtlasData,
  Farm,
  Client,
  Station,
  Segment,
  AcceptanceMode,
  ReferencePrices,
} from '../types';
import * as fs from 'node:fs';

XLSX.set_fs(fs); 

type RawRow = Array<string | number | null | undefined>;

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json<RawRow>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
}

function findHeaderRow(rows: RawRow[], keyColumn: string): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.some((cell) => String(cell ?? '').trim() === keyColumn)) {
      return i;
    }
  }
  return -1;
}

function isEmptyRow(row: RawRow | undefined): boolean {
  if (!row) return true;
  return row.every((cell) => cell === null || cell === undefined || cell === '');
}

function toNumber(value: unknown, context: string): number {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Missing number for ${context}`);
  }
  const n = Number(value);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${context}: ${value}`);
  return n;
}

function toSegment(value: unknown, context: string): Segment {
  const s = String(value ?? '').trim().toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D') return s;
  throw new Error(`Invalid segment for ${context}: ${value}`);
}

function toMode(value: unknown, context: string): AcceptanceMode {
  const m = String(value ?? '').trim().toUpperCase();
  if (m === 'EXACT' || m === 'MINIMUM') return m;
  throw new Error(`Invalid acceptance_mode for ${context}: ${value}`);
}

export function parseAtlasWorkbook(filePath: string): AtlasData {
  return parseAtlasWorkbookFromFile(filePath);
}

export function parseAtlasWorkbookFromFile(filePath: string): AtlasData {
  const workbook = XLSX.readFile(filePath);
  return parseAtlasWorkbookFromWorkbook(workbook);
}

export function parseAtlasWorkbookFromBuffer(
  file: ArrayBuffer | Buffer | Uint8Array
): AtlasData {
  const workbook = XLSX.read(file, { type: 'buffer' });
  return parseAtlasWorkbookFromWorkbook(workbook);
}

function parseAtlasWorkbookFromWorkbook(workbook: XLSX.WorkBook): AtlasData {

  const farms = parseFarms(workbook);
  const clients = parseClients(workbook);
  const station = parseStation(workbook);
  const referencePrices = parseReferencePrices(workbook);

  return { farms, clients, station, referencePrices };
}

function parseFarms(workbook: XLSX.WorkBook): Farm[] {
  const rows = getSheetRows(workbook, 'Farms');
  const headerIdx = findHeaderRow(rows, 'farm_id');
  if (headerIdx === -1) throw new Error('Farms: header row not found');

  const headers = rows[headerIdx].map((h) => String(h ?? '').trim());
  const col = (name: string): number => {
    const idx = headers.indexOf(name);
    if (idx === -1) throw new Error(`Farms: missing column ${name}`);
    return idx;
  };

  const cId = col('farm_id');
  const cName = col('farm_name');
  const cCap = col('expected_daily_capacity_t');
  const cA = col('expected_A_pct');
  const cB = col('expected_B_pct');
  const cC = col('expected_C_pct');
  const cD = col('expected_D_pct');
  const aA = col('actual_A_t');
  const aB = col('actual_B_t');
  const aC = col('actual_C_t');
  const aD = col('actual_D_t');

  const farms: Farm[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;
    const farm_id = String(row[cId] ?? '').trim();
    if (!farm_id) continue;

    farms.push({
      farm_id,
      farm_name: String(row[cName] ?? '').trim(),
      expected_daily_capacity_t: toNumber(row[cCap], `${farm_id}.expected_daily_capacity_t`),
      expected_A_pct: toNumber(row[cA], `${farm_id}.expected_A_pct`),
      expected_B_pct: toNumber(row[cB], `${farm_id}.expected_B_pct`),
      expected_C_pct: toNumber(row[cC], `${farm_id}.expected_C_pct`),
      expected_D_pct: toNumber(row[cD], `${farm_id}.expected_D_pct`),
      actual_A_t: toNumber(row[aA], `${farm_id}.actual_A_t`),
      actual_B_t: toNumber(row[aB], `${farm_id}.actual_B_t`),
      actual_C_t: toNumber(row[aC], `${farm_id}.actual_C_t`),
      actual_D_t: toNumber(row[aD], `${farm_id}.actual_D_t`),
    });
  }
  return farms;
}

function parseClients(workbook: XLSX.WorkBook): Client[] {
  const rows = getSheetRows(workbook, 'Clients');
  const headerIdx = findHeaderRow(rows, 'client_id');
  if (headerIdx === -1) throw new Error('Clients: header row not found');

  const headers = rows[headerIdx].map((h) => String(h ?? '').trim());
  const col = (name: string): number => {
    const idx = headers.indexOf(name);
    if (idx === -1) throw new Error(`Clients: missing column ${name}`);
    return idx;
  };

  const cId = col('client_id');
  const cName = col('client_name');
  const cMode = col('acceptance_mode');
  const cSeg = col('requested_segment');
  const cDem = col('demand_t');
  const cPrice = col('export_price_per_t_eur');

  const clients: Client[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;
    const client_id = String(row[cId] ?? '').trim();
    if (!client_id) continue;

    clients.push({
      client_id,
      client_name: String(row[cName] ?? '').trim(),
      acceptance_mode: toMode(row[cMode], `${client_id}.acceptance_mode`),
      requested_segment: toSegment(row[cSeg], `${client_id}.requested_segment`),
      demand_t: toNumber(row[cDem], `${client_id}.demand_t`),
      export_price_per_t_eur: toNumber(row[cPrice], `${client_id}.export_price_per_t_eur`),
    });
  }
  return clients;
}

function parseStation(workbook: XLSX.WorkBook): Station {
  const rows = getSheetRows(workbook, 'Station');
  const headerIdx = findHeaderRow(rows, 'station_id');
  if (headerIdx === -1) throw new Error('Station: header row not found');

  const headers = rows[headerIdx].map((h) => String(h ?? '').trim());
  const row = rows[headerIdx + 1];
  if (isEmptyRow(row)) throw new Error('Station: missing data row');

  const col = (name: string): number => {
    const idx = headers.indexOf(name);
    if (idx === -1) throw new Error(`Station: missing column ${name}`);
    return idx;
  };

  return {
    station_id: String(row[col('station_id')] ?? '').trim(),
    export_conditioning_capacity_t: toNumber(
      row[col('export_conditioning_capacity_t')],
      'station.export_conditioning_capacity_t'
    ),
    local_market_ratio: toNumber(
      row[col('local_market_ratio')],
      'station.local_market_ratio'
    ),
  };
}

function parseReferencePrices(workbook: XLSX.WorkBook): ReferencePrices {
  const rows = getSheetRows(workbook, 'Station');

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      row &&
      row.some((c) => String(c ?? '').trim() === 'segment') &&
      row.some((c) => String(c ?? '').trim() === 'reference_export_price_per_t_eur')
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Station: reference price table not found');

  const headers = rows[headerIdx].map((h) => String(h ?? '').trim());
  const segIdx = headers.indexOf('segment');
  const priceIdx = headers.indexOf('reference_export_price_per_t_eur');

  const prices: Partial<ReferencePrices> = {};
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;
    const segRaw = row[segIdx];
    const seg = String(segRaw ?? '').trim().toUpperCase();
    if (!seg) continue;
    if (seg !== 'A' && seg !== 'B' && seg !== 'C' && seg !== 'D') continue;
    prices[seg as Segment] = toNumber(row[priceIdx], `referencePrices.${seg}`);
  }

  if (!prices.A || !prices.B || !prices.C || !prices.D) {
    throw new Error('Station: reference price table incomplete');
  }
  return prices as ReferencePrices;
}