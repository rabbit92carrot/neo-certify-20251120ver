# Types Directory

TypeScript type definitions for the entire application.

## Files

- **database.ts**: Supabase database types (auto-generated)
- **entities.ts**: Business entity types (Product, Lot, VirtualCode, etc.)
- **api.ts**: API request/response types
- **common.ts**: Shared utility types

## Guidelines

1. Use strict TypeScript (no `any` types)
2. Define interfaces for all data structures
3. Use type unions for status values
4. Export all types from index.ts
5. Keep types close to their usage when specific to one module
