import { z } from 'zod';

const trimmedText = (minimum, maximum) => z.string().trim().min(minimum).max(maximum);
const optionalText = (maximum) => z.string().trim().max(maximum).optional().nullable();

export const loginSchema = z.object({
  email: z.email().max(150),
  password: z.string().min(8).max(100),
});

export const profileSchema = z.object({
  businessName: trimmedText(2, 150),
  businessType: trimmedText(2, 100),
  phone: trimmedText(8, 25),
  address: trimmedText(5, 1000),
});

export const borrowSchema = z.object({
  unitIds: z.array(z.number().int().positive()).min(1).max(2),
  durationDays: z.number().int().min(1).max(5),
  notes: optionalText(500),
});

export const categorySchema = z.object({
  name: trimmedText(2, 100),
  description: optionalText(500),
});

export const unitSchema = z.object({
  unitCode: trimmedText(2, 50).transform((value) => value.toUpperCase()),
  name: trimmedText(2, 150),
  description: optionalText(1000),
  conditionStatus: z.enum(['good', 'minor_damage', 'damaged']),
  availabilityStatus: z.enum(['available', 'borrowed', 'maintenance', 'inactive']),
  finePerDay: z.number().min(0).max(100_000_000),
  categoryIds: z.array(z.number().int().positive()).min(1),
});

export const memberCreateSchema = z.object({
  name: trimmedText(2, 100),
  email: z.email().max(150),
  password: z.string().min(8).max(100),
  isActive: z.boolean().default(true),
});

export const memberUpdateSchema = z.object({
  name: trimmedText(2, 100),
  email: z.email().max(150),
  password: z.union([z.literal(''), z.string().min(8).max(100)]).optional(),
  isActive: z.boolean(),
});

export const returnSchema = z.object({
  returnedCondition: z.enum(['good', 'minor_damage', 'damaged']),
  notes: optionalText(500),
});

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
