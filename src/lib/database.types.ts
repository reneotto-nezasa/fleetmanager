export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      seat_map_templates: {
        Row: {
          id: string;
          name: string;
          rows: number;
          cols: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          rows: number;
          cols?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          rows?: number;
          cols?: number;
          created_at?: string;
        };
      };
      seat_template_cells: {
        Row: {
          id: string;
          seat_map_id: string;
          row_idx: number;
          col_idx: number;
          label: string | null;
          cell_type: CellType;
          attributes: SeatAttributes;
        };
        Insert: {
          id?: string;
          seat_map_id: string;
          row_idx: number;
          col_idx: number;
          label?: string | null;
          cell_type: CellType;
          attributes?: SeatAttributes;
        };
        Update: {
          id?: string;
          seat_map_id?: string;
          row_idx?: number;
          col_idx?: number;
          label?: string | null;
          cell_type?: CellType;
          attributes?: SeatAttributes;
        };
      };
      buses: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          seat_map_id: string | null;
          status: BusStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          seat_map_id?: string | null;
          status?: BusStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          seat_map_id?: string | null;
          status?: BusStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      boarding_points: {
        Row: {
          id: string;
          code: string | null;
          name: string;
          city: string | null;
          postal_code: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          status: BoardingPointStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          name: string;
          city?: string | null;
          postal_code?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: BoardingPointStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string | null;
          name?: string;
          city?: string | null;
          postal_code?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: BoardingPointStatus;
          created_at?: string;
        };
      };
      bus_boarding_points: {
        Row: {
          id: string;
          bus_id: string;
          boarding_point_id: string;
          addon_price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          bus_id: string;
          boarding_point_id: string;
          addon_price?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          bus_id?: string;
          boarding_point_id?: string;
          addon_price?: number;
          sort_order?: number;
        };
      };
      seat_map_instances: {
        Row: {
          id: string;
          bus_id: string;
          departure_date: string;
          source_template_id: string | null;
          total_seats: number;
          booked_seats: number;
          blocked_seats: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          bus_id: string;
          departure_date: string;
          source_template_id?: string | null;
          total_seats?: number;
          booked_seats?: number;
          blocked_seats?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          bus_id?: string;
          departure_date?: string;
          source_template_id?: string | null;
          total_seats?: number;
          booked_seats?: number;
          blocked_seats?: number;
          created_at?: string;
        };
      };
      instance_seats: {
        Row: {
          id: string;
          instance_id: string;
          row_idx: number;
          col_idx: number;
          label: string | null;
          cell_type: CellType;
          status: SeatStatus;
          block_reason: string | null;
          held_until: string | null;
          attributes: SeatAttributes;
        };
        Insert: {
          id?: string;
          instance_id: string;
          row_idx: number;
          col_idx: number;
          label?: string | null;
          cell_type: CellType;
          status?: SeatStatus;
          block_reason?: string | null;
          held_until?: string | null;
          attributes?: SeatAttributes;
        };
        Update: {
          id?: string;
          instance_id?: string;
          row_idx?: number;
          col_idx?: number;
          label?: string | null;
          cell_type?: CellType;
          status?: SeatStatus;
          block_reason?: string | null;
          held_until?: string | null;
          attributes?: SeatAttributes;
        };
      };
      bookings: {
        Row: {
          id: string;
          booking_ref: string;
          bus_id: string;
          departure_date: string;
          boarding_point_id: string | null;
          status: BookingStatus;
          quote_id: string | null;
          total_price: number;
          currency: string;
          booked_at: string;
          cancelled_at: string | null;
          expires_at: string | null;
          tb_booking_ref: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_ref: string;
          bus_id: string;
          departure_date: string;
          boarding_point_id?: string | null;
          status?: BookingStatus;
          quote_id?: string | null;
          total_price?: number;
          currency?: string;
          booked_at?: string;
          cancelled_at?: string | null;
          expires_at?: string | null;
          tb_booking_ref?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_ref?: string;
          bus_id?: string;
          departure_date?: string;
          boarding_point_id?: string | null;
          status?: BookingStatus;
          quote_id?: string | null;
          total_price?: number;
          currency?: string;
          booked_at?: string;
          cancelled_at?: string | null;
          expires_at?: string | null;
          tb_booking_ref?: string | null;
          created_at?: string;
        };
      };
      seat_assignments: {
        Row: {
          id: string;
          booking_id: string;
          instance_seat_id: string;
          passenger_title: string | null;
          passenger_first_name: string | null;
          passenger_last_name: string | null;
          passenger_nezasa_ref: string | null;
          preferences: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          instance_seat_id: string;
          passenger_title?: string | null;
          passenger_first_name?: string | null;
          passenger_last_name?: string | null;
          passenger_nezasa_ref?: string | null;
          preferences?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          instance_seat_id?: string;
          passenger_title?: string | null;
          passenger_first_name?: string | null;
          passenger_last_name?: string | null;
          passenger_nezasa_ref?: string | null;
          preferences?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type CellType = 'seat' | 'driver' | 'tour_guide' | 'wc' | 'kitchen' | 'entry' | 'table' | 'empty' | 'stairway';
export type SeatStatus = 'available' | 'booked' | 'blocked' | 'held';
export type BusStatus = 'active' | 'retired';
export type BoardingPointStatus = 'active' | 'inactive';
export type BookingStatus = 'confirmed' | 'cancelled' | 'held';

export interface SeatAttributes {
  premium?: boolean;
  extraLegroom?: boolean;
  wheelchair?: boolean;
  [key: string]: boolean | undefined;
}

// Convenience type aliases
export type Tables = Database['public']['Tables'];
export type SeatMapTemplate = Tables['seat_map_templates']['Row'];
export type SeatTemplateCell = Tables['seat_template_cells']['Row'];
export type Bus = Tables['buses']['Row'];
export type BoardingPoint = Tables['boarding_points']['Row'];
export type BusBoardingPoint = Tables['bus_boarding_points']['Row'];
export type SeatMapInstance = Tables['seat_map_instances']['Row'];
export type InstanceSeat = Tables['instance_seats']['Row'];
export type Booking = Tables['bookings']['Row'];
export type SeatAssignment = Tables['seat_assignments']['Row'];
