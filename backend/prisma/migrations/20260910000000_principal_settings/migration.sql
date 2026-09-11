CREATE TABLE IF NOT EXISTS school_settings (
  school_id SERIAL PRIMARY KEY,
  school_name VARCHAR(200) NOT NULL DEFAULT '',
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  principal_name VARCHAR(100),
  academic_year VARCHAR(20),
  current_term VARCHAR(20),
  school_type VARCHAR(50),
  grades_offered VARCHAR(200),
  established_year INT,
  student_capacity INT,
  mission_statement TEXT,
  vision_statement TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO school_settings (school_id, school_name, address, phone, email, principal_name)
SELECT 1, COALESCE(school_name, ''), address, phone_number, email, COALESCE(principal_name, '')
  FROM school_profile LIMIT 1
ON CONFLICT (school_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS academic_calendar (
  calendar_id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20),
  term_start_date DATE,
  term_end_date DATE,
  exam_period_start DATE,
  exam_period_end DATE,
  break_periods TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO academic_calendar (calendar_id, academic_year)
SELECT 1, COALESCE(year_name, '')
  FROM academic_years WHERE is_current = TRUE LIMIT 1
ON CONFLICT (calendar_id) DO NOTHING;

INSERT INTO academic_calendar (calendar_id) VALUES (1)
ON CONFLICT (calendar_id) DO NOTHING;