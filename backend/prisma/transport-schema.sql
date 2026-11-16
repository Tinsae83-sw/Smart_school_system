CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id SERIAL PRIMARY KEY,
  vehicle_number VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  fuel_type VARCHAR(20),
  condition VARCHAR(20) NOT NULL DEFAULT 'GOOD',
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  purchase_date DATE,
  last_service DATE,
  next_service DATE,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  maintenance_id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  service_date DATE NOT NULL,
  odometer_reading INTEGER,
  cost DECIMAL(10, 2),
  performed_by VARCHAR(100),
  service_provider VARCHAR(200),
  next_service_date TIMESTAMP(3),
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vehicle_maintenance_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS driver_assignments (
  assignment_id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  assigned_date DATE NOT NULL,
  shift VARCHAR(20) NOT NULL,
  route TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT driver_assignments_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transport_schedules (
  schedule_id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  route_name VARCHAR(200) NOT NULL,
  route_description TEXT,
  pickup_points JSONB NOT NULL,
  dropoff_points JSONB NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week VARCHAR(10)[] NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transport_schedules_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);
