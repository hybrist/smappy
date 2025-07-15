import { z } from 'zod';

export interface InputBundle {
  id: string;
  name: string;
  importedAt: number;
  files: InputBundleFile[];
}

export interface InputBundleFile {
  /** Name of the original file. */
  name: string;
  /** Path of the file in storage. */
  storagePath: string;
}

// Validation Schemas

/**
 * Zod schema for validating input bundle files
 */
export const InputBundleFileSchema = z.object({
  name: z.string().min(1),
  storagePath: z.string().min(1)
});

/**
 * Zod schema for validating input bundles
 */
export const InputBundleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  importedAt: z.number().int().positive(),
  files: z.array(InputBundleFileSchema)
});

// Validation Functions

/**
 * Validates an input bundle file and returns the validated object
 */
export function validateInputBundleFile(file: unknown): InputBundleFile {
  return InputBundleFileSchema.parse(file);
}

/**
 * Validates an input bundle and returns the validated object
 */
export function validateInputBundle(bundle: unknown): InputBundle {
  return InputBundleSchema.parse(bundle);
}
