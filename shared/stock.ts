import { z } from "zod";

export const movementTypes = ["ADD", "TAKE", "ADJUST"] as const;
export type MovementType = (typeof movementTypes)[number];

export const itemStatuses = ["OK", "LOW", "OUT"] as const;
export type ItemStatus = (typeof itemStatuses)[number];

export const stockItemInputSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(80),
  name: z.string().trim().min(1, "Name is required").max(160),
  category: z.string().trim().max(120).default("Uncategorized"),
  location: z.string().trim().max(120).default("Main Store"),
  unit: z.string().trim().max(32).default("pcs"),
  quantity: z.coerce.number().min(0).default(0),
  minQuantity: z.coerce.number().min(0).default(0),
  imagePath: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
});

export const stockItemPatchSchema = stockItemInputSchema.partial().extend({
  sku: z.string().trim().min(1).max(80).optional()
});

export const stockMovementInputSchema = z.object({
  type: z.enum(movementTypes),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  reason: z.string().trim().min(2, "Reason is required").max(240),
  actor: z.string().trim().min(1).max(120).default("Operator")
});

export type StockItemInput = z.infer<typeof stockItemInputSchema>;
export type StockItemPatch = z.infer<typeof stockItemPatchSchema>;
export type StockMovementInput = z.infer<typeof stockMovementInputSchema>;

export type StockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  status: ItemStatus;
  imagePath: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason: string;
  actor: string;
  createdAt: string;
};

export type DashboardMetrics = {
  totalItems: number;
  totalUnits: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentMovements: StockMovement[];
};

export type ImportSummary = {
  importId: string;
  fileName: string;
  rowCount: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
};

export type ApiErrorPayload = {
  error: string;
  details?: unknown;
};

export function deriveStatus(quantity: number, minQuantity: number): ItemStatus {
  if (quantity <= 0) {
    return "OUT";
  }

  if (quantity <= minQuantity) {
    return "LOW";
  }

  return "OK";
}
