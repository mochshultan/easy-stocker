import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { ApiError, api } from "./api";
import { DashboardView, type ItemFormState, type MovementFormState } from "./components/DashboardView";
import { sortInventoryItems, type InventorySortKey, type SortDirection } from "./lib/inventorySort";
import { paginateItems } from "./lib/pagination";
import { buildInventorySuggestions } from "./lib/suggestions";
import type { DashboardMetrics, ImportSummary, MovementType, StockItem, StockItemPatch } from "../shared/stock";
import "./styles.css";

const emptyMetrics: DashboardMetrics = {
  totalItems: 0,
  totalUnits: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  recentMovements: []
};

const emptyItemForm: ItemFormState = {
  sku: "",
  name: "",
  category: "Uncategorized",
  location: "Main Store",
  unit: "pcs",
  quantity: 0,
  minQuantity: 0,
  imagePath: null,
  notes: ""
};

export default function App() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState<InventorySortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [previewItem, setPreviewItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [movementForm, setMovementForm] = useState<MovementFormState | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [adminToken, setAdminToken] = useState(() => window.localStorage.getItem("kaizenAdminToken") ?? "");
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminModeOpen, setAdminModeOpen] = useState(false);
  const [adminLogin, setAdminLogin] = useState({ username: "admin", password: "" });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminCategory, setAdminCategory] = useState("ALL");
  const [adminStatus, setAdminStatus] = useState("ALL");
  const [adminSortKey, setAdminSortKey] = useState<InventorySortKey>("name");
  const [adminSortDirection, setAdminSortDirection] = useState<SortDirection>("asc");
  const [adminIndex, setAdminIndex] = useState(0);
  const [adminDraft, setAdminDraft] = useState<StockItemPatch | null>(null);
  const [adminDirty, setAdminDirty] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("Idle");

  const query = useMemo(() => ({ search, status }), [search, status]);
  const sortedItems = useMemo(() => sortInventoryItems(items, sortKey, sortDirection), [items, sortDirection, sortKey]);
  const paginatedItems = useMemo(() => paginateItems(sortedItems, page, pageSize), [page, pageSize, sortedItems]);
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [items]
  );
  const suggestions = useMemo(() => buildInventorySuggestions(items), [items]);
  const adminItems = useMemo(() => {
    const normalizedSearch = adminSearch.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        [item.sku, item.name, item.category, item.location, item.notes ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesCategory = adminCategory === "ALL" || item.category === adminCategory;
      const matchesStatus = adminStatus === "ALL" || item.status === adminStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    return sortInventoryItems(filtered, adminSortKey, adminSortDirection);
  }, [adminCategory, adminSearch, adminSortDirection, adminSortKey, adminStatus, items]);
  const adminItem = adminItems[adminIndex] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextItems, nextMetrics] = await Promise.all([api.items(query), api.metrics()]);
      setItems(nextItems);
      setMetrics(nextMetrics);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load stock data");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, sortDirection, sortKey, pageSize]);

  useEffect(() => {
    if (page !== paginatedItems.page) {
      setPage(paginatedItems.page);
    }
  }, [page, paginatedItems.page]);

  useEffect(() => {
    setAdminIndex(0);
  }, [adminCategory, adminSearch, adminStatus]);

  useEffect(() => {
    if (adminIndex > Math.max(adminItems.length - 1, 0)) {
      setAdminIndex(Math.max(adminItems.length - 1, 0));
    }
  }, [adminIndex, adminItems.length]);

  useEffect(() => {
    setAdminDraft(adminItem ? itemToPatch(adminItem) : null);
    setAdminDirty(false);
    setAutosaveStatus(adminItem ? "Ready" : "No item");
  }, [adminItem?.id]);

  useEffect(() => {
    if (!adminDirty || !adminDraft || !adminItem || !adminToken) {
      return;
    }

    setAutosaveStatus("Saving...");
    const timeout = window.setTimeout(async () => {
      try {
        const saved = await api.updateItem(adminItem.id, adminDraft, adminToken);
        setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));
        setAdminDirty(false);
        setAutosaveStatus("Saved");
      } catch (requestError) {
        handleRequestError(requestError, "Autosave failed");
        setAutosaveStatus("Failed");
      }
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [adminDirty, adminDraft, adminItem, adminToken]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setItemFormOpen(false);
        setMovementForm(null);
        setAdminLoginOpen(false);
        setPreviewItem(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleItemSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = requireAdminToken();
    if (!token) {
      return;
    }

    setError("");
    try {
      const saved = await api.saveItem(itemForm, token);
      if (newItemImage) {
        await api.uploadImage(saved.id, newItemImage, token);
      }
      setNotice(`${saved.sku} saved`);
      setItemFormOpen(false);
      setItemForm(emptyItemForm);
      setNewItemImage(null);
      await load();
    } catch (requestError) {
      handleRequestError(requestError, "Unable to save item");
    }
  }

  async function handleMovementSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = requireAdminToken();
    if (!token) {
      return;
    }
    if (!movementForm?.item) {
      return;
    }

    setError("");
    try {
      const result = await api.movement(
        movementForm.item.id,
        {
          type: movementForm.type,
          quantity: movementForm.quantity,
          reason: movementForm.reason,
          actor: movementForm.actor
        },
        token
      );
      setNotice(`${result.item.sku} quantity is now ${result.item.quantity}`);
      setMovementForm(null);
      await load();
    } catch (requestError) {
      handleRequestError(requestError, "Unable to save movement");
    }
  }

  async function handleImageUpload(item: StockItem, file: File) {
    const token = requireAdminToken();
    if (!token) {
      return;
    }

    setError("");
    try {
      await api.uploadImage(item.id, file, token);
      setNotice(`${item.sku} image saved`);
      await load();
    } catch (requestError) {
      handleRequestError(requestError, "Unable to upload image");
    }
  }

  async function handleImportFile(file: File) {
    const token = requireAdminToken();
    if (!token) {
      return;
    }

    setError("");
    try {
      const summary = await api.importFile(file, token);
      setImportSummary(summary);
      setNotice(`${summary.fileName} imported`);
      await load();
    } catch (requestError) {
      handleRequestError(requestError, "Unable to import file");
    }
  }



  async function handleAdminLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const session = await api.adminLogin(adminLogin);
      setAdminToken(session.token);
      window.localStorage.setItem("kaizenAdminToken", session.token);
      setAdminLoginOpen(false);
      setAdminModeOpen(true);
      setNotice("Admin mode active");
    } catch (requestError) {
      handleRequestError(requestError, "Unable to login");
    }
  }

  function handleLogout() {
    setAdminToken("");
    setAdminModeOpen(false);
    window.localStorage.removeItem("kaizenAdminToken");
    setNotice("Admin mode closed");
  }

  function handleSortChange(nextKey: InventorySortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function handleAdminSortChange(nextKey: InventorySortKey) {
    if (nextKey === adminSortKey) {
      setAdminSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setAdminSortKey(nextKey);
    setAdminSortDirection("asc");
  }

  function handleAdminDraftChange(field: keyof StockItemPatch, value: string | number | null) {
    setAdminDraft((current) => ({
      ...(current ?? {}),
      [field]: value
    }));
    setAdminDirty(true);
  }

  function requireAdminToken() {
    if (adminToken) {
      return adminToken;
    }

    setAdminLoginOpen(true);
    setError("Admin login is required for data changes");
    return null;
  }

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof ApiError && requestError.status === 401) {
      setAdminToken("");
      window.localStorage.removeItem("kaizenAdminToken");
      setAdminLoginOpen(true);
    }

    setError(requestError instanceof Error ? requestError.message : fallback);
  }

  return (
    <DashboardView
      items={paginatedItems.items}
      metrics={metrics}
      loading={loading}
      search={search}
      status={status}
      sortKey={sortKey}
      sortDirection={sortDirection}
      page={paginatedItems.page}
      pageSize={paginatedItems.pageSize}
      totalPages={paginatedItems.totalPages}
      totalItems={paginatedItems.totalItems}
      pageStartItem={paginatedItems.startItem}
      pageEndItem={paginatedItems.endItem}
      previewItem={previewItem}
      notice={notice}
      error={error}
      itemFormOpen={itemFormOpen}
      movementForm={movementForm}
      itemForm={itemForm}
      newItemImageName={newItemImage?.name ?? ""}
      importSummary={importSummary}
      isAdmin={Boolean(adminToken)}
      adminLoginOpen={adminLoginOpen}
      adminModeOpen={adminModeOpen}
      adminLogin={adminLogin}
      adminItems={adminItems}
      adminItem={adminItem}
      adminIndex={adminIndex}
      adminDraft={adminDraft}
      adminSearch={adminSearch}
      adminCategory={adminCategory}
      adminStatus={adminStatus}
      adminSortKey={adminSortKey}
      adminSortDirection={adminSortDirection}
      categories={categories}
      suggestions={suggestions}
      autosaveStatus={autosaveStatus}
      onSearchChange={setSearch}
      onStatusChange={setStatus}
      onSortChange={handleSortChange}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onOpenImagePreview={setPreviewItem}
      onCloseImagePreview={() => setPreviewItem(null)}
      onRefresh={load}
      onOpenItemForm={() => {
        if (!requireAdminToken()) {
          return;
        }
        setItemForm(emptyItemForm);
        setNewItemImage(null);
        setItemFormOpen(true);
      }}
      onCloseItemForm={() => setItemFormOpen(false)}
      onItemFormChange={(field, value) =>
        setItemForm((current) => ({
          ...current,
          [field]: value
        }))
      }
      onNewItemImageChange={setNewItemImage}
      onSubmitItem={handleItemSubmit}
      onOpenMovementForm={(item: StockItem, type: MovementType) =>
        setMovementForm({
          item,
          type,
          quantity: type === "ADJUST" ? item.quantity : 1,
          reason: "",
          actor: "Operator"
        })
      }
      onCloseMovementForm={() => setMovementForm(null)}
      onMovementChange={(field, value) =>
        setMovementForm((current) =>
          current
            ? {
                ...current,
                [field]: value
              }
            : current
        )
      }
      onSubmitMovement={handleMovementSubmit}
      onImageUpload={handleImageUpload}
      onImportFile={handleImportFile}
      onOpenAdminLogin={() => setAdminLoginOpen(true)}
      onCloseAdminLogin={() => setAdminLoginOpen(false)}
      onAdminLoginChange={(field, value) => setAdminLogin((current) => ({ ...current, [field]: value }))}
      onAdminLoginSubmit={handleAdminLoginSubmit}
      onLogout={handleLogout}
      onToggleAdminMode={() => {
        if (!requireAdminToken()) {
          return;
        }
        setAdminModeOpen((current) => !current);
      }}
      onAdminSearchChange={setAdminSearch}
      onAdminCategoryChange={setAdminCategory}
      onAdminStatusChange={setAdminStatus}
      onAdminSortChange={handleAdminSortChange}
      onAdminPrev={() => setAdminIndex((current) => Math.max(0, current - 1))}
      onAdminNext={() => setAdminIndex((current) => Math.min(adminItems.length - 1, current + 1))}
      onAdminDraftChange={handleAdminDraftChange}
    />
  );
}

function itemToPatch(item: StockItem): StockItemPatch {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    location: item.location,
    unit: item.unit,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    imagePath: item.imagePath,
    notes: item.notes ?? ""
  };
}
