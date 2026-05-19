import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { DashboardView, type DashboardViewProps } from "../src/components/DashboardView";

const sampleProps: DashboardViewProps = {
  items: [
    {
      id: "1",
      sku: "BRG-001",
      name: "Bearing 6204",
      category: "Spare Part",
      location: "Gudang A",
      unit: "pcs",
      quantity: 12,
      minQuantity: 3,
      status: "OK",
      imagePath: null,
      notes: null,
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    }
  ],
  metrics: {
    totalItems: 1,
    totalUnits: 12,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: []
  },
  loading: false,
  search: "",
  status: "ALL",
  sortKey: "name",
  sortDirection: "asc",
  page: 1,
  pageSize: 25,
  totalPages: 1,
  totalItems: 1,
  pageStartItem: 1,
  pageEndItem: 1,
  previewItem: null,
  notice: "",
  error: "",
  itemFormOpen: false,
  movementForm: null,
  itemForm: {
    sku: "",
    name: "",
    category: "Uncategorized",
    location: "Main Store",
    unit: "pcs",
    quantity: 0,
    minQuantity: 0,
    imagePath: null,
    notes: ""
  },
  newItemImageName: "",
  importSummary: null,
  isAdmin: true,
  adminLoginOpen: false,
  adminModeOpen: false,
  adminLogin: { username: "admin", password: "" },
  adminItems: [],
  adminItem: null,
  adminIndex: 0,
  adminDraft: null,
  adminSearch: "",
  adminCategory: "ALL",
  adminStatus: "ALL",
  adminSortKey: "name",
  adminSortDirection: "asc",
  categories: ["Spare Part"],
  suggestions: {
    names: ["Bearing 6204"],
    categories: ["Spare Part"],
    locations: ["Gudang A"],
    units: ["pcs"],
    notes: ["Spare bearing"]
  },
  autosaveStatus: "Ready",
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
  onSortChange: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onOpenImagePreview: vi.fn(),
  onCloseImagePreview: vi.fn(),
  onRefresh: vi.fn(),
  onOpenItemForm: vi.fn(),
  onCloseItemForm: vi.fn(),
  onItemFormChange: vi.fn(),
  onNewItemImageChange: vi.fn(),
  onSubmitItem: vi.fn(),
  onOpenMovementForm: vi.fn(),
  onCloseMovementForm: vi.fn(),
  onMovementChange: vi.fn(),
  onSubmitMovement: vi.fn(),
  onImageUpload: vi.fn(),
  onImportFile: vi.fn(),
  onOpenAdminLogin: vi.fn(),
  onCloseAdminLogin: vi.fn(),
  onAdminLoginChange: vi.fn(),
  onAdminLoginSubmit: vi.fn(),
  onLogout: vi.fn(),
  onToggleAdminMode: vi.fn(),
  onAdminSearchChange: vi.fn(),
  onAdminCategoryChange: vi.fn(),
  onAdminStatusChange: vi.fn(),
  onAdminSortChange: vi.fn(),
  onAdminPrev: vi.fn(),
  onAdminNext: vi.fn(),
  onAdminDraftChange: vi.fn()
};

describe("dashboard accessibility", () => {
  it("has no automated WCAG violations in the main dashboard view", async () => {
    const { container } = render(<DashboardView {...sampleProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
