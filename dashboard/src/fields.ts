/**
 * Catalog of every field the MQTT bridge can publish under
 * `bluetti/state/<device>/<field>`, mirroring NORMAL_DEVICE_FIELDS in
 * bluetti_mqtt/mqtt_client.py. Fields arriving that are not listed here are
 * still shown in the "Other" group of the raw data table.
 */
export type FieldKind = 'numeric' | 'bool' | 'enum' | 'button' | 'array' | 'text'

export type FieldGroup =
  | 'battery'
  | 'input'
  | 'output'
  | 'inverter'
  | 'energy'
  | 'settings'
  | 'device'

export interface FieldDef {
  id: string
  label: string
  unit?: string
  kind: FieldKind
  group: FieldGroup
  /** Writable through bluetti/command/<device>/<field>. */
  settable?: boolean
  /** Decimal places for display. */
  precision?: number
}

export const FIELDS: FieldDef[] = [
  // Battery
  { id: 'total_battery_percent', label: 'Battery', unit: '%', kind: 'numeric', group: 'battery' },
  { id: 'total_battery_voltage', label: 'Battery Voltage', unit: 'V', kind: 'numeric', group: 'battery', precision: 2 },
  { id: 'total_battery_current', label: 'Battery Current', unit: 'A', kind: 'numeric', group: 'battery', precision: 1 },
  { id: 'pack_soh', label: 'State of Health', unit: '%', kind: 'numeric', group: 'battery' },
  { id: 'pack_avg_temp', label: 'Pack Avg Temperature', unit: '°F', kind: 'numeric', group: 'battery' },
  { id: 'pack_temp1', label: 'Pack Temperature 1', unit: '°F', kind: 'numeric', group: 'battery' },
  { id: 'pack_temp2', label: 'Pack Temperature 2', unit: '°F', kind: 'numeric', group: 'battery' },
  { id: 'pack_temp3', label: 'Pack Temperature 3', unit: '°F', kind: 'numeric', group: 'battery' },
  { id: 'pack_temp4', label: 'Pack Temperature 4', unit: '°F', kind: 'numeric', group: 'battery' },
  { id: 'pack_cell_count', label: 'Cell Count', kind: 'numeric', group: 'battery' },
  { id: 'pack_temp_sensor_count', label: 'Temperature Sensors', kind: 'numeric', group: 'battery' },
  { id: 'pack_cnts', label: 'Pack Count', kind: 'numeric', group: 'battery' },
  { id: 'pack_charging_status', label: 'Pack Charging Status', kind: 'numeric', group: 'battery' },
  { id: 'pack_running_status', label: 'Pack Running Status', kind: 'numeric', group: 'battery' },
  { id: 'pack_max_chg_voltage', label: 'Max Charge Voltage', unit: 'V', kind: 'numeric', group: 'battery', precision: 1 },
  { id: 'pack_max_chg_current', label: 'Max Charge Current', unit: 'A', kind: 'numeric', group: 'battery', precision: 1 },
  { id: 'pack_max_dsg_current', label: 'Max Discharge Current', unit: 'A', kind: 'numeric', group: 'battery', precision: 1 },
  { id: 'pack_chg_full_time', label: 'Time To Full', unit: 'min', kind: 'numeric', group: 'battery' },
  { id: 'pack_dsg_empty_time', label: 'Time To Empty', unit: 'min', kind: 'numeric', group: 'battery' },
  { id: 'pack_volt_type', label: 'Pack Voltage Type', kind: 'numeric', group: 'battery' },
  { id: 'cell_voltages', label: 'Cell Voltages', unit: 'V', kind: 'array', group: 'battery' },

  // Inputs
  { id: 'dc_input_power', label: 'Solar / DC Input', unit: 'W', kind: 'numeric', group: 'input' },
  { id: 'ac_input_power', label: 'AC Input', unit: 'W', kind: 'numeric', group: 'input' },
  { id: 'ac_input_voltage', label: 'AC Input Voltage', unit: 'V', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'ac_input_frequency', label: 'AC Input Frequency', unit: 'Hz', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'dc_input_voltage1', label: 'DC Input 1 Voltage', unit: 'V', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'dc_input_power1', label: 'DC Input 1 Power', unit: 'W', kind: 'numeric', group: 'input' },
  { id: 'dc_input_current1', label: 'DC Input 1 Current', unit: 'A', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'pv_num_channels', label: 'Solar Input Channels', kind: 'numeric', group: 'input' },
  { id: 'pv_channel_online', label: 'DC Input Connected', kind: 'numeric', group: 'input' },
  { id: 'pv_total_chg_energy', label: 'Solar Charge Energy', unit: 'kWh', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'grid_phase0_power', label: 'Grid Phase Power', unit: 'W', kind: 'numeric', group: 'input' },
  { id: 'grid_phase0_current', label: 'Grid Phase Current', unit: 'A', kind: 'numeric', group: 'input', precision: 1 },
  { id: 'grid_num_phases', label: 'Grid Phases', kind: 'numeric', group: 'input' },

  // Outputs
  { id: 'ac_output_power', label: 'AC Power To Devices', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'dc_output_power', label: 'DC Power To Devices', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'ac_output_on', label: 'AC Output', kind: 'bool', group: 'output', settable: true },
  { id: 'dc_output_on', label: 'DC Output', kind: 'bool', group: 'output', settable: true },
  { id: 'ac_output_mode', label: 'AC Output Mode', kind: 'enum', group: 'output' },
  { id: 'dc_5v_power', label: 'DC 5V Rail Power', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'dc_5v_current', label: 'DC 5V Rail Current', unit: 'A', kind: 'numeric', group: 'output', precision: 1 },
  { id: 'dc_12v_power', label: 'DC 12V Rail Power', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'dc_12v_current', label: 'DC 12V Rail Current', unit: 'A', kind: 'numeric', group: 'output', precision: 1 },
  { id: 'dc_24v_power', label: 'DC 24V Rail Power', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'dc_24v_current', label: 'DC 24V Rail Current', unit: 'A', kind: 'numeric', group: 'output', precision: 1 },
  { id: 'dc_load_total_power_2', label: 'DC Load Power (alt)', unit: 'W', kind: 'numeric', group: 'output' },
  { id: 'dc_load_total_energy_2', label: 'DC Load Energy (alt)', unit: 'kWh', kind: 'numeric', group: 'output', precision: 1 },

  // Inverter internals
  { id: 'internal_ac_voltage', label: 'Internal AC Voltage', unit: 'V', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'internal_ac_frequency', label: 'Internal AC Frequency', unit: 'Hz', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'inv_apparent_power', label: 'Inverter Apparent Power', unit: 'VA', kind: 'numeric', group: 'inverter' },
  { id: 'inv_output_current', label: 'Inverter Output Current', unit: 'A', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'internal_current_one', label: 'Internal Current 1', unit: 'A', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'internal_power_one', label: 'Internal Power 1', unit: 'W', kind: 'numeric', group: 'inverter' },
  { id: 'internal_current_two', label: 'Internal Current 2', unit: 'A', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'internal_power_two', label: 'Internal Power 2', unit: 'W', kind: 'numeric', group: 'inverter' },
  { id: 'internal_current_three', label: 'Internal Current 3', unit: 'A', kind: 'numeric', group: 'inverter', precision: 1 },
  { id: 'internal_power_three', label: 'Internal Power 3', unit: 'W', kind: 'numeric', group: 'inverter' },
  { id: 'split_phase_on', label: 'Split Phase', kind: 'bool', group: 'inverter' },
  { id: 'split_phase_machine_mode', label: 'Split Phase Mode', kind: 'enum', group: 'inverter' },

  // Energy totals
  { id: 'total_ac_energy', label: 'AC Energy To Devices', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'total_dc_energy', label: 'DC Energy To Devices', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'total_pv_charging_energy', label: 'Solar Charged', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'total_grid_charging_energy', label: 'Grid Charged', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'grid_total_chg_energy', label: 'Grid Charge Energy', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'pack_dsg_energy_total', label: 'Battery Discharged', unit: 'kWh', kind: 'numeric', group: 'energy', precision: 1 },
  { id: 'total_inv_power', label: 'Inverter Power', unit: 'W', kind: 'numeric', group: 'energy' },

  // The Elite 200 V2 is a portable unit with no grid export, so the protocol's
  // "feedback" counters cannot mean what their upstream names suggest. All
  // three read an identical value, so they are most likely mirrors of one
  // counter. Kept visible but labelled honestly rather than as grid export.
  { id: 'total_feedback_energy', label: 'Unidentified Energy Counter 1', unit: 'kWh', kind: 'numeric', group: 'device', precision: 1 },
  { id: 'grid_total_feedback_energy', label: 'Unidentified Energy Counter 2', unit: 'kWh', kind: 'numeric', group: 'device', precision: 1 },
  { id: 'pv_to_ac_energy', label: 'Unidentified Energy Counter 3', unit: 'kWh', kind: 'numeric', group: 'device', precision: 1 },

  // Device info
  { id: 'device_model', label: 'Model', kind: 'text', group: 'device' },
  { id: 'device_sn', label: 'Serial Number', kind: 'text', group: 'device' },
  { id: 'rate_voltage', label: 'Rated Voltage', unit: 'V', kind: 'numeric', group: 'device' },
  { id: 'rate_frequency', label: 'Rated Frequency', unit: 'Hz', kind: 'numeric', group: 'device' },
  { id: 'inv_number', label: 'Inverter Count', kind: 'numeric', group: 'device' },
  { id: 'inv_num_phases', label: 'Inverter Phases', kind: 'numeric', group: 'device' },
  { id: 'inv_power_type', label: 'Inverter Power Type', kind: 'numeric', group: 'device' },
  { id: 'inv_working_status', label: 'Inverter Status', kind: 'numeric', group: 'device' },
  { id: 'ctrl_status', label: 'Control Status Bitfield', kind: 'numeric', group: 'device' },
  { id: 'energy_lines', label: 'Energy Flow Bitfield', kind: 'numeric', group: 'device' },
  { id: 'cfg_protocol_version', label: 'Protocol Version', kind: 'numeric', group: 'device' },
  { id: 'cfg_modbus_version', label: 'Modbus Version', kind: 'numeric', group: 'device' },
  { id: 'can_bus_fault_bin', label: 'CAN Bus Faults', kind: 'numeric', group: 'device' },
  { id: 'pack_online_bin', label: 'Packs Online Bitfield', kind: 'numeric', group: 'device' },
  { id: 'inv_online_bin', label: 'Inverters Online Bitfield', kind: 'numeric', group: 'device' },
  { id: 'pack_aging_data_bin', label: 'Pack Aging Bitfield', kind: 'numeric', group: 'device' },

  // Settings / controls
  { id: 'charging_mode', label: 'Charging Mode', kind: 'enum', group: 'settings', settable: true },
  { id: 'ups_mode', label: 'UPS Mode', kind: 'enum', group: 'settings', settable: true },
  { id: 'led_mode', label: 'LED Mode', kind: 'enum', group: 'settings', settable: true },
  { id: 'auto_sleep_mode', label: 'Screen Auto Sleep', kind: 'enum', group: 'settings', settable: true },
  { id: 'eco_shutdown', label: 'ECO Shutdown', kind: 'enum', group: 'settings', settable: true },
  { id: 'grid_charge_on', label: 'Grid Charge', kind: 'bool', group: 'settings', settable: true },
  { id: 'time_control_on', label: 'Time Control', kind: 'bool', group: 'settings', settable: true },
  { id: 'eco_on', label: 'ECO Mode', kind: 'bool', group: 'settings', settable: true },
  { id: 'power_lifting_on', label: 'Power Lifting', kind: 'bool', group: 'settings', settable: true },
  { id: 'battery_range_start', label: 'Battery Range Start', unit: '%', kind: 'numeric', group: 'settings', settable: true },
  { id: 'battery_range_end', label: 'Battery Range End', unit: '%', kind: 'numeric', group: 'settings', settable: true },
  { id: 'power_off', label: 'Power Off', kind: 'button', group: 'settings', settable: true },
]

export const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]))

export const GROUP_LABELS: Record<FieldGroup, string> = {
  battery: 'Battery',
  input: 'Inputs',
  output: 'Output to devices',
  inverter: 'Inverter internals',
  energy: 'Energy totals',
  settings: 'Settings & controls',
  device: 'Device & diagnostics',
}

export const GROUP_ORDER: FieldGroup[] = [
  'battery',
  'input',
  'output',
  'inverter',
  'energy',
  'settings',
  'device',
]

export function humanize(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAc\b/g, 'AC')
    .replace(/\bDc\b/g, 'DC')
    .replace(/\bUps\b/g, 'UPS')
    .replace(/\bLed\b/g, 'LED')
    .replace(/\bEco\b/g, 'ECO')
    .replace(/\bSoc\b/g, 'SOC')
}
