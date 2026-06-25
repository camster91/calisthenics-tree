/**
 * `cn` — class-name composer.
 * Used by every component to merge Tailwind classes with conditional logic.
 * Pattern: clsx for truthiness + tailwind-merge to dedupe conflicting utilities.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
