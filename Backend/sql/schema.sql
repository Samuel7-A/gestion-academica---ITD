-- Esquema SQL de la base de datos APF3 (PostgreSQL).
-- Generado desde la migración Alembic con: alembic upgrade head --sql
-- Se puede ejecutar directamente en el SQL Editor de Supabase.
-- Recomendado: usar "alembic upgrade head" para que la versión quede registrada.

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE TABLE courses (
    id VARCHAR(50) NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    CONSTRAINT pk_courses PRIMARY KEY (id), 
    CONSTRAINT uq_courses_name UNIQUE (name)
);

CREATE TABLE sections (
    id VARCHAR(50) NOT NULL, 
    year INTEGER NOT NULL, 
    grade_level VARCHAR(50) NOT NULL, 
    section_name VARCHAR(20) NOT NULL, 
    CONSTRAINT pk_sections PRIMARY KEY (id), 
    CONSTRAINT ck_sections_year_valid CHECK (year BETWEEN 2000 AND 2100), 
    CONSTRAINT uq_sections_year_grade_section UNIQUE (year, grade_level, section_name)
);

CREATE TABLE students (
    id VARCHAR(50) NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    full_name VARCHAR(150) NOT NULL, 
    CONSTRAINT pk_students PRIMARY KEY (id), 
    CONSTRAINT uq_students_code UNIQUE (code)
);

CREATE TABLE users (
    id VARCHAR(50) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(20) NOT NULL, 
    full_name VARCHAR(150), 
    CONSTRAINT pk_users PRIMARY KEY (id), 
    CONSTRAINT ck_users_role_valid CHECK (role IN ('teacher', 'admin')), 
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE course_sections (
    id VARCHAR(50) NOT NULL, 
    course_id VARCHAR(50) NOT NULL, 
    section_id VARCHAR(50) NOT NULL, 
    teacher_id VARCHAR(50) NOT NULL, 
    CONSTRAINT pk_course_sections PRIMARY KEY (id), 
    CONSTRAINT fk_course_sections_course_id_courses FOREIGN KEY(course_id) REFERENCES courses (id) ON DELETE RESTRICT, 
    CONSTRAINT fk_course_sections_section_id_sections FOREIGN KEY(section_id) REFERENCES sections (id) ON DELETE RESTRICT, 
    CONSTRAINT fk_course_sections_teacher_id_users FOREIGN KEY(teacher_id) REFERENCES users (id) ON DELETE RESTRICT, 
    CONSTRAINT uq_course_sections_course_section UNIQUE (course_id, section_id)
);

CREATE INDEX ix_course_sections_teacher_id ON course_sections (teacher_id);

CREATE TABLE academic_indicators (
    student_id VARCHAR(50) NOT NULL, 
    course_section_id VARCHAR(50) NOT NULL, 
    attendance_pct NUMERIC(5, 2) NOT NULL, 
    homework_pct NUMERIC(5, 2) NOT NULL, 
    participation_pct NUMERIC(5, 2) NOT NULL, 
    previous_average NUMERIC(4, 2), 
    CONSTRAINT pk_academic_indicators PRIMARY KEY (student_id, course_section_id), 
    CONSTRAINT ck_academic_indicators_attendance_range CHECK (attendance_pct >= 0 AND attendance_pct <= 100), 
    CONSTRAINT ck_academic_indicators_homework_range CHECK (homework_pct >= 0 AND homework_pct <= 100), 
    CONSTRAINT ck_academic_indicators_participation_range CHECK (participation_pct >= 0 AND participation_pct <= 100), 
    CONSTRAINT ck_academic_indicators_previous_average_range CHECK (previous_average IS NULL OR (previous_average >= 0 AND previous_average <= 20)), 
    CONSTRAINT fk_academic_indicators_course_section_id_course_sections FOREIGN KEY(course_section_id) REFERENCES course_sections (id) ON DELETE CASCADE, 
    CONSTRAINT fk_academic_indicators_student_id_students FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE activities (
    id VARCHAR(80) NOT NULL, 
    course_section_id VARCHAR(50) NOT NULL, 
    bimester INTEGER NOT NULL, 
    title VARCHAR(150) NOT NULL, 
    CONSTRAINT pk_activities PRIMARY KEY (id), 
    CONSTRAINT ck_activities_bimester_valid CHECK (bimester BETWEEN 1 AND 4), 
    CONSTRAINT fk_activities_course_section_id_course_sections FOREIGN KEY(course_section_id) REFERENCES course_sections (id) ON DELETE CASCADE
);

CREATE INDEX ix_activities_course_section_id ON activities (course_section_id);

CREATE TABLE annual_results (
    student_id VARCHAR(50) NOT NULL, 
    course_section_id VARCHAR(50) NOT NULL, 
    final_grade NUMERIC(4, 2) NOT NULL, 
    CONSTRAINT pk_annual_results PRIMARY KEY (student_id, course_section_id), 
    CONSTRAINT ck_annual_results_final_grade_range CHECK (final_grade >= 0 AND final_grade <= 20), 
    CONSTRAINT fk_annual_results_course_section_id_course_sections FOREIGN KEY(course_section_id) REFERENCES course_sections (id) ON DELETE CASCADE, 
    CONSTRAINT fk_annual_results_student_id_students FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE
);

CREATE TABLE enrollments (
    id VARCHAR(80) NOT NULL, 
    student_id VARCHAR(50) NOT NULL, 
    course_section_id VARCHAR(50) NOT NULL, 
    CONSTRAINT pk_enrollments PRIMARY KEY (id), 
    CONSTRAINT fk_enrollments_course_section_id_course_sections FOREIGN KEY(course_section_id) REFERENCES course_sections (id) ON DELETE CASCADE, 
    CONSTRAINT fk_enrollments_student_id_students FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE, 
    CONSTRAINT uq_enrollments_student_course_section UNIQUE (student_id, course_section_id)
);

CREATE INDEX ix_enrollments_course_section_id ON enrollments (course_section_id);

CREATE TABLE grades (
    id VARCHAR(80) NOT NULL, 
    activity_id VARCHAR(80) NOT NULL, 
    student_id VARCHAR(50) NOT NULL, 
    value NUMERIC(4, 2) NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    CONSTRAINT pk_grades PRIMARY KEY (id), 
    CONSTRAINT ck_grades_value_range CHECK (value >= 0 AND value <= 20), 
    CONSTRAINT fk_grades_activity_id_activities FOREIGN KEY(activity_id) REFERENCES activities (id) ON DELETE CASCADE, 
    CONSTRAINT fk_grades_student_id_students FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE, 
    CONSTRAINT uq_grades_activity_student UNIQUE (activity_id, student_id)
);

CREATE INDEX ix_grades_student_id ON grades (student_id);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

COMMIT;

