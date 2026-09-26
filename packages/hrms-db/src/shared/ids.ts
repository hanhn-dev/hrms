import { z } from "zod";

export const employerIdSchema = z.number().int().positive();
export const employeeIdSchema = z.number().int().positive();
export const userIdSchema = z.number().int().positive();
export const roleIdSchema = z.number().int().positive();
export const employmentNumberSchema = z.string().trim().min(1);
export const menuIdSchema = z.number().int().positive();
export const tabIdSchema = z.number().int().nonnegative();
export const fieldIdSchema = z.number().int().positive();

export function parseEmployerId(value: number): number {
  return employerIdSchema.parse(value);
}

export function parseEmploymentNumber(value: string): string {
  return employmentNumberSchema.parse(value);
}
