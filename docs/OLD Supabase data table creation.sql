-- SQL SCRIPT TO RUN IN YOUR SUPABASE SQL EDITOR

-- 1. Create the 'students' table
-- This table will store a record for each student who starts the simulation.
CREATE TABLE public.students (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    full_name text NOT NULL,
    CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- 2. Create the 'evaluations' table
-- This table will store the results of each completed simulation, linked to a student.
CREATE TABLE public.evaluations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    student_id uuid NOT NULL,
    score integer NOT NULL,
    summary text,
    criteria jsonb,
    CONSTRAINT evaluations_pkey PRIMARY KEY (id),
    CONSTRAINT evaluations_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 3. Enable Row Level Security (RLS)
-- This is a crucial security step in Supabase. It ensures that data is protected by default.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies
-- These rules define who can access or modify the data.
-- For now, we are allowing anyone to create new students and evaluations.
-- IMPORTANT: You would want to tighten these rules for the instructor dashboard later.

-- Allow anyone to create a new student record.
CREATE POLICY "Allow public insert for students"
ON public.students
FOR INSERT WITH CHECK (true);

-- Allow anyone to create a new evaluation record.
CREATE POLICY "Allow public insert for evaluations"
ON public.evaluations
FOR INSERT WITH CHECK (true);

-- For the future dashboard, you'll need read access. This is a placeholder.
-- You would later restrict this to an authenticated instructor role.
CREATE POLICY "Allow public read access"
ON public.students
FOR SELECT USING (true);

CREATE POLICY "Allow public read access"
ON public.evaluations
FOR SELECT USING (true);