import {
  Activity,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Boxes,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Download,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Upload,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import type {
  DashboardMetrics,
  ImportSummary,
  MovementType,
  StockItem,
  StockItemInput,
  StockItemPatch,
  StockMovementInput
} from "../../shared/stock";
import type { InventorySortKey, SortDirection } from "../lib/inventorySort";
import { thumbnailUrl } from "../lib/imageUrls";
import type { InventorySuggestions } from "../lib/suggestions";

export type ItemFormState = StockItemInput;

export type MovementFormState = StockMovementInput & {
  item: StockItem | null;
};

export type DashboardViewProps = {
  items: StockItem[];
  metrics: DashboardMetrics;
  loading: boolean;
  search: string;
  status: string;
  sortKey: InventorySortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageStartItem: number;
  pageEndItem: number;
  previewItem: StockItem | null;
  notice: string;
  error: string;
  itemFormOpen: boolean;
  movementForm: MovementFormState | null;
  itemForm: ItemFormState;
  newItemImageName: string;
  importSummary: ImportSummary | null;
  isAdmin: boolean;
  adminLoginOpen: boolean;
  adminModeOpen: boolean;
  adminLogin: { username: string; password: string };
  adminItems: StockItem[];
  adminItem: StockItem | null;
  adminIndex: number;
  adminDraft: StockItemPatch | null;
  adminSearch: string;
  adminCategory: string;
  adminStatus: string;
  adminSortKey: InventorySortKey;
  adminSortDirection: SortDirection;
  categories: string[];
  suggestions: InventorySuggestions;
  autosaveStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (key: InventorySortKey) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenImagePreview: (item: StockItem) => void;
  onCloseImagePreview: () => void;
  onRefresh: () => void;
  onOpenItemForm: () => void;
  onCloseItemForm: () => void;
  onItemFormChange: (field: keyof ItemFormState, value: string | number) => void;
  onNewItemImageChange: (file: File | null) => void;
  onSubmitItem: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpenMovementForm: (item: StockItem, type: MovementType) => void;
  onCloseMovementForm: () => void;
  onMovementChange: (field: keyof StockMovementInput, value: string | number) => void;
  onSubmitMovement: (event: React.FormEvent<HTMLFormElement>) => void;
  onImageUpload: (item: StockItem, file: File) => void;
  onImportFile: (file: File) => void;
  onOpenAdminLogin: () => void;
  onCloseAdminLogin: () => void;
  onAdminLoginChange: (field: "username" | "password", value: string) => void;
  onAdminLoginSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  onToggleAdminMode: () => void;
  onAdminSearchChange: (value: string) => void;
  onAdminCategoryChange: (value: string) => void;
  onAdminStatusChange: (value: string) => void;
  onAdminSortChange: (key: InventorySortKey) => void;
  onAdminPrev: () => void;
  onAdminNext: () => void;
  onAdminDraftChange: (field: keyof StockItemPatch, value: string | number | null) => void;
};

export function DashboardView(props: DashboardViewProps) {
  const {
    items,
    metrics,
    loading,
    search,
    status,
    sortKey,
    sortDirection,
    page,
    pageSize,
    totalPages,
    totalItems,
    pageStartItem,
    pageEndItem,
    previewItem,
    notice,
    error,
    itemFormOpen,
    movementForm,
    itemForm,
    importSummary,
    isAdmin,
    adminLoginOpen,
    adminModeOpen
  } = props;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#inventory-table">
        Skip to inventory table
      </a>

      <aside className="rail" aria-label="Primary">
        <div className="brand-mark" aria-hidden="true">
          KS
        </div>
        <nav>
          <a href="#overview" aria-label="Overview">
            <Gauge size={20} aria-hidden="true" />
          </a>
          <a href="#inventory-table" aria-label="Inventory">
            <Boxes size={20} aria-hidden="true" />
          </a>
          <a href="#imports" aria-label="Import and export">
            <Upload size={20} aria-hidden="true" />
          </a>
        </nav>
      </aside>

      <main className="workspace">
        <header className="masthead">
          <div>
            <p className="eyebrow">Kaizen Control Room</p>
            <h1>Stock Data Operations</h1>
          </div>
          <div className="masthead-actions">
            <button className="button secondary" type="button" onClick={() => {
              const downloadLink = (url: string) => {
                const a = document.createElement("a");
                a.href = url;
                // document.body.appendChild(a);
                a.click();
                // document.body.removeChild(a);
              };
              downloadLink('/api/export.csv');
              downloadLink('/api/export.xlsx');
            }}>
              <Download size={18} aria-hidden="true" />
              Export Data
            </button>
            <button className="button secondary" type="button" onClick={props.isAdmin ? props.onToggleAdminMode : props.onOpenAdminLogin}>
              <Shield size={18} aria-hidden="true" />
              {props.isAdmin ? "Modify Data" : "Admin Login"}
            </button>
            {props.isAdmin ? (
              <button className="icon-button" type="button" onClick={props.onLogout} aria-label="Logout admin">
                <LogOut size={18} aria-hidden="true" />
              </button>
            ) : null}
            <button className="button primary" type="button" onClick={props.onOpenItemForm}>
              <PackagePlus size={18} aria-hidden="true" />
              Add Item
            </button>
          </div>
        </header>

        <section className="status-region" aria-live="polite" aria-atomic="true">
          {notice ? <p className="notice success">{notice}</p> : null}
          {error ? <p className="notice danger">{error}</p> : null}
        </section>

        <section id="overview" aria-labelledby="overview-title" className="metrics-grid">
          <h2 id="overview-title" className="sr-only">
            Overview
          </h2>
          <Metric label="Total items" value={metrics.totalItems} icon={<Boxes size={22} />} />
          <Metric label="Total units" value={metrics.totalUnits} icon={<Activity size={22} />} />
          <Metric label="Low stock" value={metrics.lowStockItems} icon={<AlertTriangle size={22} />} tone="warning" />
          <Metric label="Out of stock" value={metrics.outOfStockItems} icon={<CircleOff size={22} />} tone="danger" />
        </section>

        <section className="control-band" aria-labelledby="controls-title">
          <div>
            <h2 id="controls-title">Inventory Control</h2>
            <p>
              Showing {pageStartItem}-{pageEndItem} of {totalItems} rows
            </p>
          </div>
          <div className="control-group">
            <label className="search-field">
              <span>Search stock</span>
              <Search size={18} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => props.onSearchChange(event.target.value)}
                placeholder="SKU, name, category, location"
              />
            </label>
            <label className="select-field">
              <span>Status</span>
              <select value={status} onChange={(event) => props.onStatusChange(event.target.value)}>
                <option value="ALL">All</option>
                <option value="OK">OK</option>
                <option value="LOW">Low</option>
                <option value="OUT">Out</option>
              </select>
            </label>
            <button className="icon-button" type="button" onClick={props.onRefresh} aria-label="Refresh inventory">
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          </div>
        </section>

        {adminModeOpen ? <AdminEditor {...props} /> : null}

        <section className="data-surface" aria-labelledby="table-title">
          <div className="surface-heading">
            <div>
              <h2 id="table-title">Inventory Register</h2>
              <p>{loading ? "Loading stock data" : "Current stock position"}</p>
            </div>
            <PaginationControls
              label="Inventory pages top"
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalItems}
              pageStartItem={pageStartItem}
              pageEndItem={pageEndItem}
              onPageChange={props.onPageChange}
              onPageSizeChange={props.onPageSizeChange}
            />
          </div>

          <div className="table-wrap">
            <table id="inventory-table">
              <caption>Stock items with quantity, status, image, and stock movement actions</caption>
              <thead>
                <tr>
                  <SortableHeader label="Item" sortField="name" activeKey={sortKey} direction={sortDirection} onSort={props.onSortChange} />
                  <SortableHeader label="Category" sortField="category" activeKey={sortKey} direction={sortDirection} onSort={props.onSortChange} />
                  <SortableHeader label="Location" sortField="location" activeKey={sortKey} direction={sortDirection} onSort={props.onSortChange} />
                  <SortableHeader label="Quantity" sortField="quantity" activeKey={sortKey} direction={sortDirection} onSort={props.onSortChange} />
                  <SortableHeader label="Status" sortField="status" activeKey={sortKey} direction={sortDirection} onSort={props.onSortChange} />
                  <th scope="col">Image</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => <InventoryRow key={item.id} item={item} {...props} />)
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No stock rows match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="surface-footer">
            <PaginationControls
              label="Inventory pages bottom"
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalItems}
              pageStartItem={pageStartItem}
              pageEndItem={pageEndItem}
              onPageChange={props.onPageChange}
              onPageSizeChange={props.onPageSizeChange}
            />
          </div>
        </section>

        <section id="imports" className="import-band" aria-labelledby="imports-title">
          <div>
            <h2 id="imports-title">CSV and Image Data</h2>
            {importSummary ? (
              <p>
                Last import: {importSummary.created} created, {importSummary.updated} updated,{" "}
                {importSummary.errors.length} errors.
              </p>
            ) : (
              <p>Accepts CSV and XLSX files.</p>
            )}
          </div>
          {isAdmin ? (
            <label className="file-drop">
              <Upload size={18} aria-hidden="true" />
              <span>Import file</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    props.onImportFile(file);
                    event.currentTarget.value = "";
                  }
                }}
              />
            </label>
          ) : (
            <button className="button secondary" type="button" onClick={props.onOpenAdminLogin}>
              <Shield size={18} aria-hidden="true" />
              Admin Login
            </button>
          )}
        </section>
      </main>

      {itemFormOpen ? (
        <FormDialog title="Add or Update Item" onClose={props.onCloseItemForm}>
          <form className="form-grid item-form-grid" onSubmit={props.onSubmitItem}>
            <TextInput label="SKU" value={itemForm.sku} onChange={(value) => props.onItemFormChange("sku", value)} required />
            <TextInput
              label="Name"
              value={itemForm.name}
              onChange={(value) => props.onItemFormChange("name", value)}
              suggestions={props.suggestions.names}
              listId="item-name-suggestions"
              required
            />
            <TextInput
              label="Category"
              value={itemForm.category}
              onChange={(value) => props.onItemFormChange("category", value)}
              suggestions={props.suggestions.categories}
              listId="item-category-suggestions"
            />
            <TextInput
              label="Location"
              value={itemForm.location}
              onChange={(value) => props.onItemFormChange("location", value)}
              suggestions={props.suggestions.locations}
              listId="item-location-suggestions"
            />
            <TextInput
              label="Unit"
              value={itemForm.unit}
              onChange={(value) => props.onItemFormChange("unit", value)}
              suggestions={props.suggestions.units}
              listId="item-unit-suggestions"
            />
            <NumberInput
              label="Quantity"
              value={itemForm.quantity}
              onChange={(value) => props.onItemFormChange("quantity", value)}
            />
            <NumberInput
              label="Minimum"
              value={itemForm.minQuantity}
              onChange={(value) => props.onItemFormChange("minQuantity", value)}
            />
            <TextInput
              label="Notes (optional)"
              value={itemForm.notes ?? ""}
              onChange={(value) => props.onItemFormChange("notes", value)}
              suggestions={props.suggestions.notes}
              listId="item-note-suggestions"
            />
            <div className="media-panel full-span" aria-labelledby="new-item-image-title">
              <div>
                <h3 id="new-item-image-title">Item Image</h3>
                <p>{props.newItemImageName || "No image selected"}</p>
              </div>
              <label className="file-drop">
                <ImageIcon size={18} aria-hidden="true" />
                <span>Select image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => props.onNewItemImageChange(event.currentTarget.files?.[0] ?? null)}
                />
              </label>
              <CameraCapture onCapture={props.onNewItemImageChange} autoOpen={true} />
            </div>
            <div className="dialog-actions full-span">
              <button className="button secondary" type="button" onClick={props.onCloseItemForm}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                <Plus size={18} aria-hidden="true" />
                Save Item
              </button>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {movementForm?.item ? (
        <FormDialog
          title={`${movementForm.type === "ADD" ? "Add" : movementForm.type === "TAKE" ? "Take" : "Adjust"} Stock`}
          onClose={props.onCloseMovementForm}
        >
          <form className="form-grid compact" onSubmit={props.onSubmitMovement}>
            <p className="dialog-context full-span">
              {movementForm.item.sku} - {movementForm.item.name}
            </p>
            <NumberInput
              label={movementForm.type === "ADJUST" ? "New quantity" : "Quantity"}
              value={movementForm.quantity}
              onChange={(value) => props.onMovementChange("quantity", value)}
            />
            <TextInput label="Actor" value={movementForm.actor} onChange={(value) => props.onMovementChange("actor", value)} />
            <label className="field full-span">
              <span>Reason</span>
              <textarea
                value={movementForm.reason}
                onChange={(event) => props.onMovementChange("reason", event.target.value)}
                rows={3}
                required
              />
            </label>
            <div className="dialog-actions full-span">
              <button className="button secondary" type="button" onClick={props.onCloseMovementForm}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                Save Movement
              </button>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {adminLoginOpen ? (
        <FormDialog title="Admin Login" onClose={props.onCloseAdminLogin}>
          <form className="form-grid compact" onSubmit={props.onAdminLoginSubmit}>
            <TextInput
              label="Admin ID"
              value={props.adminLogin.username}
              onChange={(value) => props.onAdminLoginChange("username", value)}
              required
            />
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={props.adminLogin.password}
                onChange={(event) => props.onAdminLoginChange("password", event.target.value)}
                required
              />
            </label>
            <div className="dialog-actions full-span">
              <button className="button secondary" type="button" onClick={props.onCloseAdminLogin}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                <Shield size={18} aria-hidden="true" />
                Enter Admin
              </button>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {previewItem?.imagePath ? <ImagePreviewDialog item={previewItem} onClose={props.onCloseImagePreview} /> : null}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "neutral"
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <article className={`metric ${tone}`}>
      <div aria-hidden="true">{icon}</div>
      <p>{label}</p>
      <strong>{value.toLocaleString("en-US")}</strong>
    </article>
  );
}

function SortableHeader({
  label,
  sortField,
  activeKey,
  direction,
  onSort
}: {
  label: string;
  sortField: InventorySortKey;
  activeKey: InventorySortKey;
  direction: SortDirection;
  onSort: (key: InventorySortKey) => void;
}) {
  const active = sortField === activeKey;
  const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th scope="col" aria-sort={ariaSort}>
      <button className="sort-button" type="button" onClick={() => onSort(sortField)}>
        {label}
        {active && direction === "asc" ? <ArrowUpAZ size={16} aria-hidden="true" /> : <ArrowDownAZ size={16} aria-hidden="true" />}
      </button>
    </th>
  );
}

function InventoryRow({
  item,
  isAdmin,
  onOpenMovementForm,
  onImageUpload,
  onOpenAdminLogin,
  onOpenImagePreview
}: DashboardViewProps & { item: StockItem }) {
  const imageInputId = `image-${item.id}`;
  return (
    <tr>
      <th scope="row">
        <span className="item-name">{item.name}</span>
        <span className="muted">{item.sku}</span>
      </th>
      <td>{item.category}</td>
      <td>{item.location}</td>
      <td>
        <span className="quantity">{item.quantity.toLocaleString("en-US")}</span>
        <span className="muted"> {item.unit}</span>
      </td>
      <td>
        <span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
      </td>
      <td>
        <div className="image-cell">
          {item.imagePath ? (
            <button className="image-preview-button" type="button" onClick={() => onOpenImagePreview(item)}>
              <img
                src={thumbnailUrl(item.imagePath, 160)}
                alt={`${item.name} stock reference`}
                loading="lazy"
                decoding="async"
              />
            </button>
          ) : (
            <span>No image</span>
          )}
          {isAdmin ? (
            <>
              <label className="small-icon-button" htmlFor={imageInputId} title={`Upload image for ${item.name}`}>
                <ImageIcon size={16} aria-hidden="true" />
                <span className="sr-only">Upload image for {item.name}</span>
              </label>
              <input
                id={imageInputId}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    onImageUpload(item, file);
                    event.currentTarget.value = "";
                  }
                }}
              />
            </>
          ) : null}
        </div>
      </td>
      <td>
        <div className="row-actions">
          {isAdmin ? (
            <>
              <button type="button" className="small-button add" onClick={() => onOpenMovementForm(item, "ADD")}>
                <Plus size={16} aria-hidden="true" />
                Add
              </button>
              <button type="button" className="small-button take" onClick={() => onOpenMovementForm(item, "TAKE")}>
                <Minus size={16} aria-hidden="true" />
                Take
              </button>
              <button type="button" className="small-button" onClick={() => onOpenMovementForm(item, "ADJUST")}>
                Adjust
              </button>
            </>
          ) : (
            <button type="button" className="small-button" onClick={onOpenAdminLogin}>
              Admin
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AdminEditor(props: DashboardViewProps) {
  const { adminItem, adminDraft, adminItems, adminIndex, categories } = props;

  return (
    <section className="admin-surface" aria-labelledby="admin-title">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Admin Workspace</p>
          <h2 id="admin-title">Data Modifying Mode</h2>
          <p>{adminItems.length ? `${adminIndex + 1} of ${adminItems.length}` : "No item in this filter"}</p>
        </div>
        <div className="admin-save-state" aria-live="polite">
          {props.autosaveStatus}
        </div>
      </div>

      <div className="admin-controls">
        <label className="search-field">
          <span>Search data</span>
          <Search size={18} aria-hidden="true" />
          <input
            value={props.adminSearch}
            onChange={(event) => props.onAdminSearchChange(event.target.value)}
            placeholder="SKU, item, notes"
          />
        </label>
        <label className="select-field">
          <span>Category</span>
          <select value={props.adminCategory} onChange={(event) => props.onAdminCategoryChange(event.target.value)}>
            <option value="ALL">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Status</span>
          <select value={props.adminStatus} onChange={(event) => props.onAdminStatusChange(event.target.value)}>
            <option value="ALL">All</option>
            <option value="OK">OK</option>
            <option value="LOW">Low</option>
            <option value="OUT">Out</option>
          </select>
        </label>
        <label className="select-field">
          <span>Sort</span>
          <select value={props.adminSortKey} onChange={(event) => props.onAdminSortChange(event.target.value as InventorySortKey)}>
            <option value="name">Name</option>
            <option value="sku">SKU</option>
            <option value="category">Category</option>
            <option value="location">Location</option>
            <option value="quantity">Quantity</option>
            <option value="status">Status</option>
            <option value="updatedAt">Updated</option>
          </select>
        </label>
        <button className="small-button" type="button" onClick={() => props.onAdminSortChange(props.adminSortKey)}>
          {props.adminSortDirection === "asc" ? "Asc" : "Desc"}
        </button>
      </div>

      <div className="admin-record">
        <button className="icon-button" type="button" onClick={props.onAdminPrev} disabled={adminIndex <= 0} aria-label="Previous item">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        {adminItem && adminDraft ? (
          <div className="admin-detail" aria-label={`Editing ${adminItem.name}`}>
            <div className="admin-image-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <div className="admin-image">
                {adminItem.imagePath ? (
                  <button className="admin-image-button" type="button" onClick={() => props.onOpenImagePreview(adminItem)}>
                    <img
                      src={thumbnailUrl(adminItem.imagePath, 640)}
                      alt={`${adminItem.name} stock reference`}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ) : (
                  <span>No image</span>
                )}
              </div>
              <label className="file-drop" style={{ alignSelf: "center", width: "100%" }}>
                <ImageIcon size={18} aria-hidden="true" />
                <span>{adminItem.imagePath ? "Change Image" : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file && adminItem) {
                      props.onImageUpload(adminItem, file);
                      event.currentTarget.value = "";
                    }
                  }}
                />
              </label>
              <CameraCapture
                onCapture={(file) => {
                  if (adminItem) {
                    props.onImageUpload(adminItem, file);
                  }
                }}
              />
            </div>
            <div className="form-grid admin-form">
              <TextInput label="SKU" value={String(adminDraft.sku ?? "")} onChange={(value) => props.onAdminDraftChange("sku", value)} required />
              <TextInput
                label="Name"
                value={String(adminDraft.name ?? "")}
                onChange={(value) => props.onAdminDraftChange("name", value)}
                suggestions={props.suggestions.names}
                listId="admin-name-suggestions"
                required
              />
              <TextInput
                label="Category"
                value={String(adminDraft.category ?? "")}
                onChange={(value) => props.onAdminDraftChange("category", value)}
                suggestions={props.suggestions.categories}
                listId="admin-category-suggestions"
              />
              <TextInput
                label="Location"
                value={String(adminDraft.location ?? "")}
                onChange={(value) => props.onAdminDraftChange("location", value)}
                suggestions={props.suggestions.locations}
                listId="admin-location-suggestions"
              />
              <TextInput
                label="Unit"
                value={String(adminDraft.unit ?? "")}
                onChange={(value) => props.onAdminDraftChange("unit", value)}
                suggestions={props.suggestions.units}
                listId="admin-unit-suggestions"
              />
              <NumberInput
                label="Quantity"
                value={Number(adminDraft.quantity ?? 0)}
                onChange={(value) => props.onAdminDraftChange("quantity", value)}
              />
              <NumberInput
                label="Minimum"
                value={Number(adminDraft.minQuantity ?? 0)}
                onChange={(value) => props.onAdminDraftChange("minQuantity", value)}
              />
              <TextInput
                label="Image Path"
                value={String(adminDraft.imagePath ?? "")}
                onChange={(value) => props.onAdminDraftChange("imagePath", value || null)}
              />
              <TextInput
                label="Notes (optional)"
                value={String(adminDraft.notes ?? "")}
                onChange={(value) => props.onAdminDraftChange("notes", value)}
                suggestions={props.suggestions.notes}
                listId="admin-note-suggestions"
              />
            </div>
          </div>
        ) : (
          <p className="empty-cell">No item matches the admin filter.</p>
        )}
        <button
          className="icon-button"
          type="button"
          onClick={props.onAdminNext}
          disabled={adminIndex >= adminItems.length - 1}
          aria-label="Next item"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function PaginationControls({
  label,
  page,
  pageSize,
  totalPages,
  totalItems,
  pageStartItem,
  pageEndItem,
  onPageChange,
  onPageSizeChange
}: {
  label: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageStartItem: number;
  pageEndItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <nav className="pagination" aria-label={label}>
      <p>
        {pageStartItem}-{pageEndItem} / {totalItems}
      </p>
      <label className="select-field compact-select">
        <span>Max per page</span>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
      <div className="pagination-buttons">
        <button className="small-button" type="button" onClick={() => onPageChange(1)} disabled={page <= 1}>
          First
        </button>
        <button className="small-button" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Prev
        </button>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <button className="small-button" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
        <button className="small-button" type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          Last
        </button>
      </div>
    </nav>
  );
}

function ImagePreviewDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="image-dialog" role="dialog" aria-modal="true" aria-labelledby="image-preview-title">
        <div className="dialog-heading">
          <div>
            <h2 id="image-preview-title">{item.name}</h2>
            <p className="dialog-subtitle">{item.sku}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close image preview">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="image-preview-stage">
          <img src={item.imagePath ?? ""} alt={`${item.name} full-size stock reference`} />
        </div>
      </div>
    </div>
  );
}

function CameraCapture({ onCapture, autoOpen = false }: { onCapture: (file: File) => void; autoOpen?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraResolution, setCameraResolution] = useState("");

  useEffect(() => {
    if (autoOpen) {
      startCamera();
    }
    return () => stopCamera();
  }, [autoOpen]);

  async function startCamera(index = deviceIndex) {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera unavailable");
      return;
    }

    stopCamera();
    try {
      const nextDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = nextDevices.filter((device) => device.kind === "videoinput");
      setDevices(cameras);
      const selected = cameras[index];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(selected?.deviceId ? { deviceId: { exact: selected.deviceId } } : { facingMode: "environment" }),
          // Minta resolusi tertinggi yang bisa diberikan kamera
          width:  { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        // Tampilkan resolusi aktual yang diberikan kamera
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.width && settings?.height) {
          setCameraResolution(`${settings.width}×${settings.height}`);
        } else {
          setCameraResolution("");
        }
      }
      setActive(true);
      setDeviceIndex(index);
    } catch {
      setCameraError("Camera failed");
      setActive(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }

  async function switchCamera() {
    const nextIndex = devices.length ? (deviceIndex + 1) % devices.length : 0;
    await startCamera(nextIndex);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    console.log(`[Camera] Capturing at ${canvas.width}×${canvas.height}`);
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Gunakan PNG (lossless) agar kualitas kamera tidak turun sebelum upload
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Capture failed");
        return;
      }
      console.log(`[Camera] PNG blob size: ${(blob.size / 1024).toFixed(0)} KB`);
      onCapture(new File([blob], `camera-${Date.now()}.png`, { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="camera-panel">
      <video ref={videoRef} playsInline muted aria-label="Camera preview" />
      <canvas ref={canvasRef} className="sr-only" />
      <div className="camera-actions">
        {!autoOpen && (
          <button className="small-button" type="button" onClick={() => startCamera()}>
            <Camera size={16} aria-hidden="true" />
            Open Camera
          </button>
        )}
        <button className="small-button" type="button" onClick={switchCamera} disabled={!active || devices.length < 2}>
          Camera {devices.length ? deviceIndex + 1 : 1}
        </button>
        <button className="small-button add" type="button" onClick={capture} disabled={!active}>
          Capture
        </button>
        <button className="small-button" type="button" onClick={stopCamera} disabled={!active}>
          Stop
        </button>
      </div>
      {cameraResolution ? <p className="camera-info">Resolusi: {cameraResolution}</p> : null}
      {cameraError ? <p className="camera-error">{cameraError}</p> : null}
    </div>
  );
}

function FormDialog({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  suggestions,
  listId,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  listId?: string;
  required?: boolean;
}) {
  const suggestionValues = suggestions ?? [];
  const datalistId = suggestionValues.length ? listId : undefined;

  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} list={datalistId} onChange={(event) => onChange(event.target.value)} required={required} />
      {datalistId ? (
        <datalist id={datalistId}>
          {suggestionValues.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function statusLabel(status: StockItem["status"]) {
  if (status === "LOW") {
    return "Low";
  }
  if (status === "OUT") {
    return "Out";
  }
  return "OK";
}
