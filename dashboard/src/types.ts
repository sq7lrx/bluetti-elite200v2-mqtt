export type FieldValue = number | string | boolean | Record<string, unknown> | null

export interface FieldState {
  value: FieldValue
  at: number
}

export interface HistoryPoint {
  t: number
  [field: string]: number | null
}

export interface DeviceState {
  id: string
  lastSeen: number
  fields: Record<string, FieldState>
  history: HistoryPoint[]
}

export interface Snapshot {
  type: 'snapshot'
  mqtt: { connected: boolean; host: string; port: number }
  historyFields: string[]
  devices: DeviceState[]
}

export type ServerMessage =
  | Snapshot
  | { type: 'mqtt'; connected: boolean }
  | { type: 'update'; device: string; field: string; value: FieldValue; at: number }
  | { type: 'history'; device: string; point: HistoryPoint }

export interface PackDetails {
  status?: string
  percent?: number
  voltage?: number
  voltages?: number[]
}
