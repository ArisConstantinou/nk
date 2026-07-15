import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileInput,
  FilePenLine,
  FolderKanban,
  Image,
  ListFilter,
  PackagePlus,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ServerCog,
  Settings2,
  Tags,
  Users,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi, errorMessage } from "../api";
import { useAdminAuth } from "../auth/AdminAuth";
import { EmptyState, PageHeading } from "../components/AdminStates";
import {
  canManageEnquiries,
  canManageMedia,
  canReadForms,
  canReadKind,
  canWriteKind,
} from "../permissions";
import type { ContentKind, ContentStatus } from "../types";

type WorkItem = {
  id: string;
  type: "content" | "media";
  kind: ContentKind | "media";
  title: string;
  slug: string;
  status: ContentStatus | "active" | "inactive";
  version: number;
  category: string;
  tags: string[];
  updatedAt: string;
  publishedAt: string | null;
  updatedBy: string;
  favorite: boolean;
  to: string;
  pinnedAt?: string;
};

type Notification = {
  id: string;
  level: "success" | "info" | "warning" | "critical";
  title: string;
  body: string;
  to: string;
};
type SystemItem = {
  id: string;
  label: string;
  status: "healthy" | "warning" | "error";
  detail: string;
};
type ActivityItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  display_name: string | null;
};
type Dashboard = {
  content: Record<string, number>;
  statuses: { draft: number; published: number; archived: number };
  enquiries: Record<string, number>;
  submissions: Record<string, number>;
  recent: ActivityItem[];
  workQueue: WorkItem[];
  drafts: WorkItem[];
  recentlyEdited: WorkItem[];
  favorites: WorkItem[];
  notifications: Notification[];
  system: SystemItem[];
  summary: {
    content: number;
    media: number;
    activeUsers: number;
    warnings: number;
  };
};

type BulkAction =
  | "publish"
  | "unpublish"
  | "archive"
  | "set-category"
  | "add-tags"
  | "remove-tags";
const bulkLabels: Record<BulkAction, string> = {
  publish: "Publish",
  unpublish: "Take offline",
  archive: "Archive",
  "set-category": "Set category",
  "add-tags": "Add tags",
  "remove-tags": "Remove tags",
};
const kindLabels: Record<string, string> = {
  page: "Pages",
  service: "Services",
  product: "Products",
  catalogue: "Catalogues",
  project: "Projects",
  company: "Company",
  seo: "SEO",
  settings: "Settings",
  media: "Media",
};

function relativeDate(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return new Date(value).toLocaleDateString();
}

function actionLabel(action: string) {
  return action
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardPage() {
  const { user } = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(params.get("kind") || "all");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"updated" | "title" | "status">("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("publish");
  const [bulkValue, setBulkValue] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi<Dashboard>("/dashboard"));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const writable = useMemo(
    () =>
      new Set(
        (data?.workQueue || [])
          .filter(
            (item) =>
              user &&
              item.kind !== "media" &&
              canWriteKind(user.role, item.kind),
          )
          .map((item) => item.id),
      ),
    [data?.workQueue, user],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          (data?.workQueue || []).map((item) => item.category).filter(Boolean),
        ),
      ].sort(),
    [data?.workQueue],
  );
  const shown = useMemo(
    () =>
      (data?.workQueue || [])
        .filter((item) => {
          const matchesAge =
            params.get("age") !== "stale" ||
            (item.status === "draft" &&
              new Date(item.updatedAt).getTime() < Date.now() - 14 * 86400000);
          const haystack =
            `${item.title} ${item.slug} ${item.kind} ${item.status} ${item.category} ${item.tags.join(" ")} ${item.updatedBy}`.toLowerCase();
          return (
            matchesAge &&
            (kind === "all" || item.kind === kind) &&
            (status === "all" || item.status === status) &&
            (category === "all" || item.category === category) &&
            (!query || haystack.includes(query.toLowerCase()))
          );
        })
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title)
            : sort === "status"
              ? a.status.localeCompare(b.status) ||
                a.title.localeCompare(b.title)
              : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [category, data?.workQueue, kind, params, query, sort, status],
  );
  const visible = useMemo(
    () => shown.slice(0, visibleCount),
    [shown, visibleCount],
  );
  useEffect(() => {
    setVisibleCount(20);
    setSelected(new Set());
  }, [category, kind, query, sort, status]);

  const selectAll = (checked: boolean) =>
    setSelected(
      checked
        ? new Set(
            visible
              .filter((item) => writable.has(item.id))
              .map((item) => item.id),
          )
        : new Set(),
    );
  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setStatus("all");
    setCategory("all");
    setSort("updated");
    setParams({}, { replace: true });
  };

  const toggleFavorite = async (item: WorkItem) => {
    setBusy(true);
    setError("");
    try {
      const result = await adminApi<{ active: boolean; favorites: WorkItem[] }>(
        `/favorites/${item.type}/${item.id}`,
        { method: "PUT", body: JSON.stringify({ active: !item.favorite }) },
      );
      setData((current) =>
        current
          ? {
              ...current,
              favorites: result.favorites,
              workQueue: current.workQueue.map((record) =>
                record.id === item.id
                  ? { ...record, favorite: result.active }
                  : record,
              ),
            }
          : current,
      );
      setNotice(
        result.active ? `Pinned “${item.title}”.` : `Unpinned “${item.title}”.`,
      );
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const applyBulk = async () => {
    if (!data || !selected.size) return;
    const needsValue = ["set-category", "add-tags", "remove-tags"].includes(
      bulkAction,
    );
    if (needsValue && !bulkValue.trim()) {
      setError(
        bulkAction === "set-category"
          ? "Enter a category for the selected records."
          : "Enter one or more comma-separated tags.",
      );
      return;
    }
    if (
      ["archive", "unpublish"].includes(bulkAction) &&
      !window.confirm(
        `${bulkLabels[bulkAction]} ${selected.size} selected record${selected.size === 1 ? "" : "s"}?`,
      )
    )
      return;
    const items = data.workQueue
      .filter((item) => selected.has(item.id))
      .map((item) => ({ id: item.id, version: item.version }));
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi("/content/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: bulkAction,
          items,
          category: bulkValue.trim(),
          tags: bulkValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      setSelected(new Set());
      setBulkValue("");
      setNotice(
        `${bulkLabels[bulkAction]} completed for ${items.length} record${items.length === 1 ? "" : "s"}.`,
      );
      await load();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const openGlobalSearch = () =>
    window.dispatchEvent(new CustomEvent("nk-admin:open-search"));
  const contentLanding = !user
    ? null
    : canReadKind(user.role, "page")
      ? "/admin/pages"
      : canReadKind(user.role, "product")
        ? "/admin/products"
        : canReadKind(user.role, "project")
          ? "/admin/projects"
          : null;

  return (
    <div className="nk-productivity-dashboard">
      <PageHeading
        eyebrow="NK / PRODUCTIVITY CENTRE"
        title="Website control centre"
        description="Find, review and act on every website item from one accountable workspace."
        actions={
          <>
            <button type="button" onClick={openGlobalSearch}>
              <Search />
              Search everything
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "nk-admin-spin" : ""} />
              Refresh
            </button>
          </>
        }
      />
      {error && (
        <p className="nk-admin-alert nk-admin-alert--error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X />
          </button>
        </p>
      )}
      {notice && (
        <p className="nk-admin-alert" role="status">
          <Check />
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X />
          </button>
        </p>
      )}
      {loading || !data ? (
        <div className="nk-admin-list-loading">
          <RefreshCw className="nk-admin-spin" />
          Loading live website status…
        </div>
      ) : (
        <>
          {user && (
            <section
              className="nk-admin-quick-actions"
              aria-label="Quick actions"
            >
              <span>Quick actions</span>
              {canWriteKind(user.role, "page") && (
                <Link to="/admin/pages">
                  <FilePenLine />
                  Edit website
                </Link>
              )}
              {canWriteKind(user.role, "product") && (
                <Link to="/admin/products?new=1">
                  <PackagePlus />
                  Add product
                </Link>
              )}
              {canWriteKind(user.role, "project") && (
                <Link to="/admin/projects?new=1">
                  <FolderKanban />
                  Add project
                </Link>
              )}
              {canManageEnquiries(user.role) && (
                <Link to="/admin/enquiries?new=1">
                  <ClipboardList />
                  Record enquiry
                </Link>
              )}
              {canReadForms(user.role) && (
                <Link to="/admin/forms">
                  <FileInput />
                  Open inbox
                </Link>
              )}
              {canManageMedia(user.role) && (
                <Link to="/admin/media?upload=1">
                  <Image />
                  Upload media
                </Link>
              )}
            </section>
          )}

          <section
            className="nk-productivity-metrics"
            aria-label="Website summary"
          >
            <button
              type="button"
              onClick={() => {
                setStatus("draft");
                setParams({ status: "draft" }, { replace: true });
              }}
            >
              <FilePenLine />
              <span>Drafts</span>
              <b>{data.statuses.draft}</b>
              <small>Waiting for review</small>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("published");
                setParams({ status: "published" }, { replace: true });
              }}
            >
              <Rocket />
              <span>Published</span>
              <b>{data.statuses.published}</b>
              <small>Currently live</small>
            </button>
            {canReadForms(user!.role) ? (
              <Link to="/admin/forms">
                <ClipboardList />
                <span>New submissions</span>
                <b>{data.submissions.new || 0}</b>
                <small>Need a response</small>
              </Link>
            ) : (
              <div>
                <Image />
                <span>Media assets</span>
                <b>{data.summary.media}</b>
                <small>Managed files</small>
              </div>
            )}
            <button
              type="button"
              className={data.summary.warnings ? "warning" : ""}
              onClick={() =>
                document
                  .getElementById("dashboard-alerts")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <BellRing />
              <span>Warnings</span>
              <b>{data.summary.warnings}</b>
              <small>
                {data.summary.warnings ? "Require attention" : "No blockers"}
              </small>
            </button>
          </section>

          <section className="nk-productivity-top-grid">
            <div className="nk-productivity-panel nk-productivity-pinned">
              <header>
                <div>
                  <Pin />
                  <span>PINNED ITEMS</span>
                </div>
                <b>Your shortest route to frequent work</b>
              </header>
              {data.favorites.length ? (
                <div>
                  {data.favorites.slice(0, 8).map((item) => (
                    <article key={`${item.type}-${item.id}`}>
                      <Link to={item.to}>
                        <span>{kindLabels[item.kind] || item.kind}</span>
                        <b>{item.title}</b>
                        <small>
                          {item.status} · {relativeDate(item.updatedAt)}
                        </small>
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void toggleFavorite({ ...item, favorite: true })
                        }
                        aria-label={`Unpin ${item.title}`}
                      >
                        <PinOff />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nothing pinned yet"
                  body="Pin records from the work queue or global search for one-click access."
                />
              )}
            </div>
            <div className="nk-productivity-panel" id="dashboard-alerts">
              <header>
                <div>
                  <BellRing />
                  <span>ALERTS & NOTIFICATIONS</span>
                </div>
                <b>What needs attention now</b>
              </header>
              <div className="nk-productivity-alerts">
                {data.notifications.map((item) => (
                  <Link className={item.level} to={item.to} key={item.id}>
                    {item.level === "critical" ? (
                      <CircleAlert />
                    ) : item.level === "warning" ? (
                      <AlertTriangle />
                    ) : item.level === "success" ? (
                      <CheckCircle2 />
                    ) : (
                      <BellRing />
                    )}
                    <span>
                      <b>{item.title}</b>
                      <small>{item.body}</small>
                    </span>
                    <ChevronRight />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section
            className="nk-productivity-workqueue"
            aria-labelledby="workqueue-title"
          >
            <header>
              <div>
                <span>CONTENT OPERATIONS</span>
                <h2 id="workqueue-title">Work queue</h2>
                <p>
                  Filter, sort, pin and update multiple records without opening
                  each one.
                </p>
              </div>
              <span>
                {shown.length} of {data.workQueue.length}
              </span>
            </header>
            <div className="nk-productivity-filters">
              <label>
                <Search />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, slug, category, tags or editor"
                  aria-label="Search work queue"
                />
              </label>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                aria-label="Filter by content type"
              >
                <option value="all">All content types</option>
                {Object.keys(data.content).map((value) => (
                  <option value={value} key={value}>
                    {kindLabels[value] || value}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                aria-label="Sort work queue"
              >
                <option value="updated">Recently updated</option>
                <option value="title">Title A–Z</option>
                <option value="status">Publication status</option>
              </select>
              <button type="button" onClick={clearFilters}>
                <X />
                Clear
              </button>
            </div>
            {selected.size > 0 && (
              <div
                className="nk-productivity-bulk"
                role="region"
                aria-label="Bulk actions"
              >
                <strong>{selected.size} selected</strong>
                <select
                  value={bulkAction}
                  onChange={(event) => {
                    setBulkAction(event.target.value as BulkAction);
                    setBulkValue("");
                  }}
                  aria-label="Choose bulk action"
                >
                  {Object.entries(bulkLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {["set-category", "add-tags", "remove-tags"].includes(
                  bulkAction,
                ) && (
                  <input
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    placeholder={
                      bulkAction === "set-category"
                        ? "Category name"
                        : "tag one, tag two"
                    }
                    aria-label={
                      bulkAction === "set-category"
                        ? "Category name"
                        : "Comma-separated tags"
                    }
                  />
                )}
                <button
                  className="nk-admin-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void applyBulk()}
                >
                  {bulkAction.includes("tag") ? (
                    <Tags />
                  ) : bulkAction === "publish" ? (
                    <Rocket />
                  ) : (
                    <Archive />
                  )}
                  {busy ? "Working…" : "Apply"}
                </button>
                <button type="button" onClick={() => setSelected(new Set())}>
                  Cancel
                </button>
              </div>
            )}
            {shown.length ? (
              <>
                <div className="nk-productivity-table">
                  <div className="nk-productivity-table-head">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          visible.some((item) => writable.has(item.id)) &&
                          visible
                            .filter((item) => writable.has(item.id))
                            .every((item) => selected.has(item.id))
                        }
                        onChange={(event) => selectAll(event.target.checked)}
                        aria-label="Select all visible writable records"
                      />
                    </label>
                    <span>Record</span>
                    <span>Taxonomy</span>
                    <span>Status</span>
                    <span>Updated</span>
                    <span />
                  </div>
                  {visible.map((item) => (
                    <article key={item.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          disabled={!writable.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </label>
                      <Link className="nk-productivity-record" to={item.to}>
                        <span>{kindLabels[item.kind] || item.kind}</span>
                        <b>{item.title}</b>
                        <small>/{item.slug}</small>
                      </Link>
                      <div className="nk-productivity-taxonomy">
                        {item.category && <b>{item.category}</b>}
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                        {!item.category && !item.tags.length && (
                          <small>Uncategorised</small>
                        )}
                      </div>
                      <span
                        className={`nk-admin-status nk-admin-status--${item.status}`}
                      >
                        <i />
                        {item.status}
                      </span>
                      <div className="nk-productivity-updated">
                        <b>{relativeDate(item.updatedAt)}</b>
                        <small>
                          {item.updatedBy} · v{item.version}
                        </small>
                      </div>
                      <div className="nk-productivity-row-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleFavorite(item)}
                          aria-label={`${item.favorite ? "Unpin" : "Pin"} ${item.title}`}
                        >
                          {item.favorite ? <PinOff /> : <Pin />}
                        </button>
                        <Link to={item.to} aria-label={`Edit ${item.title}`}>
                          <ChevronRight />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {visible.length < shown.length && (
                  <div className="nk-productivity-pagination">
                    <span>
                      Showing {visible.length} of {shown.length} matching
                      records
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((current) => current + 20)}
                    >
                      Show 20 more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No records match these filters"
                body="Clear one or more filters to return to the full work queue."
              />
            )}
          </section>

          <section className="nk-productivity-lower-grid">
            <div className="nk-productivity-panel">
              <header>
                <div>
                  <FilePenLine />
                  <span>DRAFTS & UNPUBLISHED</span>
                </div>
                <b>Content waiting for a decision</b>
              </header>
              <div className="nk-productivity-compact-list">
                {data.drafts.length ? (
                  data.drafts.slice(0, 7).map((item) => (
                    <Link to={item.to} key={item.id}>
                      <span>
                        <b>{item.title}</b>
                        <small>
                          {kindLabels[item.kind]} · {item.updatedBy}
                        </small>
                      </span>
                      <time>{relativeDate(item.updatedAt)}</time>
                    </Link>
                  ))
                ) : (
                  <p>No draft content is waiting.</p>
                )}
              </div>
            </div>
            <div className="nk-productivity-panel">
              <header>
                <div>
                  <RefreshCw />
                  <span>RECENTLY EDITED</span>
                </div>
                <b>
                  {user?.role === "owner"
                    ? "Latest changes across the team"
                    : "Your latest content changes"}
                </b>
              </header>
              <div className="nk-productivity-compact-list">
                {data.recentlyEdited.length ? (
                  data.recentlyEdited.slice(0, 7).map((item) => (
                    <Link to={item.to} key={item.id}>
                      <span>
                        <b>{item.title}</b>
                        <small>
                          {item.updatedBy} · {item.status}
                        </small>
                      </span>
                      <time>{relativeDate(item.updatedAt)}</time>
                    </Link>
                  ))
                ) : (
                  <p>No recent edits are available.</p>
                )}
              </div>
            </div>
          </section>

          <section className="nk-productivity-lower-grid">
            <div className="nk-productivity-panel">
              <header>
                <div>
                  <ServerCog />
                  <span>SYSTEM & INTEGRATIONS</span>
                </div>
                <b>Live operational checks</b>
              </header>
              <div className="nk-productivity-system">
                {data.system.map((item) => (
                  <article key={item.id}>
                    <i className={item.status} />
                    <span>
                      <b>{item.label}</b>
                      <small>{item.detail}</small>
                    </span>
                    <em>{item.status}</em>
                  </article>
                ))}
              </div>
            </div>
            <div className="nk-productivity-panel">
              <header>
                <div>
                  <Activity />
                  <span>ACTIVITY LOG</span>
                </div>
                <b>
                  {user?.role === "owner"
                    ? "Who changed what and when"
                    : "Your accountable actions"}
                </b>
              </header>
              <div className="nk-productivity-activity">
                {data.recent.slice(0, 8).map((item) => (
                  <article key={item.id}>
                    <i />
                    <span>
                      <b>{actionLabel(item.action)}</b>
                      <small>
                        {item.display_name || "System"} · {item.entity_type}
                        {item.details.title
                          ? ` · ${String(item.details.title)}`
                          : ""}
                      </small>
                    </span>
                    <time>{relativeDate(item.created_at)}</time>
                  </article>
                ))}
              </div>
              <Link className="nk-productivity-panel-link" to="/admin/audit">
                Open complete activity log <ChevronRight />
              </Link>
            </div>
          </section>
          {contentLanding && (
            <p className="nk-productivity-footer-note">
              <Settings2 />
              Prefer the focused editor?{" "}
              <Link to={contentLanding}>Open the content workspace</Link>. Every
              change remains versioned and auditable.
            </p>
          )}
        </>
      )}
    </div>
  );
}
