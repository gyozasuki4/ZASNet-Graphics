export type RadarState = 'valid' | 'no_data' | 'below_threshold' | 'range_folded';
export interface RadialDescriptor { azimuth:number; start_azimuth:number; end_azimuth:number; delta_azimuth:number; first_gate_m:number; gate_spacing_m:number; gate_count:number; value_offset:number; state_offset:number; }
export interface L3Header { format:string; version:number; compression:string; file_id:string; radar_site:string; product_code:string; units:string; radial_count:number; gate_count:number; radials:RadialDescriptor[]; }
export interface DecodedL3 { header:L3Header; values:Float32Array; states:Uint8Array; }
export interface RadarMetadata { file_id:string; radar_site:string; product_code:string; product_name:string; scan_time:string; latitude:number; longitude:number; radar_altitude:number; elevation_angle:number; units:string; radial_count:number; gate_count:number; decoded_size:number; min_valid_dbz:number; max_valid_dbz:number; special_states:RadarState[]; decode_time_ms:number; }
