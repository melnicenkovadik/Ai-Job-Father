/**
 * Category-fields Zod schema barrel.
 *
 * Phase 2 ships `tech` + shared base primitives. The remaining 11 category
 * schemas (design, marketing, sales, product, finance, hr, support, content,
 * ops, data, web3) land incrementally in Phase 3 wizard execution; UI
 * renders whichever category's schema is active.
 */

export * from './base';
export * from './tech';
