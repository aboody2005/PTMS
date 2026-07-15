-- Migration: Add pharmacy_notes column to students table
-- Run this in your Supabase Dashboard → SQL Editor

ALTER TABLE students
ADD COLUMN IF NOT EXISTS pharmacy_notes TEXT DEFAULT '';
