import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { ErrorState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import { useToast } from "../components/toast-context";
import {
  createMenu,
  deleteMenu,
  getMenu,
  listMenus,
  saveMenuTree,
  searchLinkableResources,
  updateMenu,
  type AdminMenuDetail,
  type AdminMenuNode,
  type AdminMenuNodeLinkType,
  type AdminMenuResourceType,
  type AdminMenuStatus,
  type AdminMenuSummary,
  type LinkableResource,
  type MenuFormInput,
  type MenuNodeInput,
} from "../lib/api";

type MenuFormState = MenuFormInput & { id?: string };
type NodeFormState = MenuNodeInput & { id: string };

const menuStatuses = ["active", "inactive", "archived"] as const;
const nodeStatuses = ["active", "inactive", "archived"] as const;
const linkTypes = ["custom", "page", "post", "category", "tag", "label"] as const;
const locations = ["header", "footer", "mobile"] as const;

const emptyMenuForm: MenuFormState = {
  description: "",
  location: "header",
  name: "",
  slug: "",
  status: "active",
};

const emptyNodeForm: NodeFormState = {
  cssClass: "",
  icon: "",
  id: "",
  linkType: "custom",
  rel: "",
  resourceId: null,
  resourceType: null,
  status: "active",
  target: "_self",
  title: "",
  url: "",
};

export function MenusPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const token = auth.token ?? "";
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm);
  const [nodeForm, setNodeForm] = useState<NodeFormState>(emptyNodeForm);
  const [nodes, setNodes] = useState<MenuNodeInput[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [resourceSearch, setResourceSearch] = useState("");

  const menusQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listMenus(token),
    queryKey: ["menus"],
  });
  const resourcesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => searchLinkableResources(token, resourceSearch),
    queryKey: ["menus", "linkable-resources", resourceSearch],
  });
  const loadMenuMutation = useMutation({
    mutationFn: (menuId: string) => getMenu(token, menuId),
    onSuccess: (menu) => {
      setMenuForm(toMenuForm(menu));
      setNodes(toNodeInputs(menu.nodes));
      setNodeForm(emptyNodeForm);
    },
  });
  const saveMenuMutation = useMutation({
    mutationFn: async (input: MenuFormState) => {
      if (input.id) {
        return updateMenu(token, input.id, input);
      }

      return createMenu(token, input);
    },
    onSuccess: async (menu) => {
      setMenuForm(toMenuForm(menu));
      setNodes(toNodeInputs(menu.nodes));
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      notify({ message: "Menu metadata has been saved.", title: "Menu saved", variant: "success" });
    },
  });
  const saveTreeMutation = useMutation({
    mutationFn: async () => {
      if (!menuForm.id) {
        throw new Error("Create a menu before saving its tree.");
      }

      return saveMenuTree(token, menuForm.id, normalizeTree(nodes));
    },
    onSuccess: async (menu) => {
      setNodes(toNodeInputs(menu.nodes));
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      notify({ message: "Menu tree has been saved.", title: "Tree saved", variant: "success" });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (menuId: string) => deleteMenu(token, menuId),
    onSuccess: async () => {
      setPendingDeleteId(null);
      setMenuForm(emptyMenuForm);
      setNodes([]);
      await queryClient.invalidateQueries({ queryKey: ["menus"] });
      notify({ message: "Menu has been deleted.", title: "Menu deleted", variant: "success" });
    },
  });

  const flatNodes = useMemo(() => flattenForUi(nodes), [nodes]);
  const menus = menusQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];
  const error =
    menusQuery.error ??
    resourcesQuery.error ??
    loadMenuMutation.error ??
    saveMenuMutation.error ??
    saveTreeMutation.error ??
    deleteMutation.error;

  const columns: DataTableColumn<AdminMenuSummary>[] = [
    {
      header: "Menu",
      id: "menu",
      render: (menu) => (
        <>
          <strong>{menu.name}</strong>
          <span>{menu.slug}</span>
        </>
      ),
      sortable: true,
      sortValue: (menu) => menu.name,
    },
    {
      header: "Location",
      id: "location",
      render: (menu) => menu.location,
      sortable: true,
      sortValue: (menu) => menu.location,
    },
    {
      header: "Status",
      id: "status",
      render: (menu) => (
        <span className={`status-pill status-pill--${menu.status}`}>{menu.status}</span>
      ),
      sortable: true,
      sortValue: (menu) => menu.status,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (menu) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.MENUS_EDIT}>
            <button
              type="button"
              aria-label={`Edit ${menu.name}`}
              onClick={() => loadMenuMutation.mutate(menu.id)}
            >
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.MENUS_DELETE}>
            <button
              type="button"
              aria-label={`Delete ${menu.name}`}
              onClick={() => setPendingDeleteId(menu.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMenuMutation.mutate(menuForm);
  }

  function handleNodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const node = normalizeNodeForm(nodeForm);

    if (!node.id) {
      node.id = crypto.randomUUID();
      setNodes((current) => [...current, node]);
    } else {
      setNodes((current) => replaceNode(current, node));
    }

    setNodeForm(emptyNodeForm);
  }

  function editNode(node: MenuNodeInput) {
    setNodeForm({
      ...emptyNodeForm,
      ...node,
      id: node.id ?? "",
      linkType: node.linkType,
    });
  }

  function removeNode(nodeId: string) {
    setNodes((current) => removeNodeById(current, nodeId));
  }

  function applyResource(resource: LinkableResource) {
    setNodeForm((current) => ({
      ...current,
      linkType: resource.type,
      resourceId: resource.id,
      resourceType: resource.type,
      title: current.title || resource.title,
      url: "",
    }));
  }

  return (
    <section className="menus-page">
      <PageHeader
        eyebrow="Structure"
        title="Menus"
        actions={
          <PermissionGate permission={Permission.MENUS_CREATE}>
            <Button
              type="button"
              onClick={() => {
                setMenuForm(emptyMenuForm);
                setNodes([]);
                setNodeForm(emptyNodeForm);
              }}
            >
              <CmsIcon name="plus" />
              New menu
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load menus." />}

      <div className="menus-layout">
        <Card className="table-panel">
          <DataTable
            columns={columns}
            data={menus}
            emptyDescription="Create a menu for header, footer, or mobile navigation."
            emptyTitle="No menus found"
            getRowKey={(menu) => menu.id}
            isLoading={menusQuery.isLoading}
            loadingDescription="Fetching navigation menus."
            loadingTitle="Loading menus"
          />
        </Card>

        <Card className="form-panel">
          <form className="menu-form" onSubmit={handleMenuSubmit}>
            <div>
              <p>{menuForm.id ? "Edit menu" : "Create menu"}</p>
              <h3>{menuForm.id ? menuForm.name : "New menu"}</h3>
            </div>
            {Boolean(saveMenuMutation.error) && (
              <ValidationSummary error={saveMenuMutation.error} fallback="Unable to save menu." />
            )}
            <label>
              Name
              <Input
                required
                value={menuForm.name}
                onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Slug
                <Input
                  required
                  value={menuForm.slug}
                  onChange={(event) =>
                    setMenuForm({ ...menuForm, slug: normalizeSlug(event.target.value) })
                  }
                />
              </label>
              <label>
                Location
                <select
                  value={menuForm.location}
                  onChange={(event) =>
                    setMenuForm({
                      ...menuForm,
                      location: normalizeSlug(event.target.value),
                    })
                  }
                >
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Status
              <select
                value={menuForm.status}
                onChange={(event) =>
                  setMenuForm({ ...menuForm, status: event.target.value as AdminMenuStatus })
                }
              >
                {menuStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                value={menuForm.description ?? ""}
                onChange={(event) => setMenuForm({ ...menuForm, description: event.target.value })}
              />
            </label>
            <Button disabled={saveMenuMutation.isPending} type="submit">
              {saveMenuMutation.isPending ? "Saving" : menuForm.id ? "Save menu" : "Create menu"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="menu-builder-grid">
        <PermissionGate permission={Permission.MENU_NODES_EDIT}>
          <Card className="menu-builder-panel">
            <section>
              <header className="menu-builder-header">
                <div>
                  <p>Builder</p>
                  <h3>Menu tree</h3>
                </div>
                <Button
                  disabled={!menuForm.id || saveTreeMutation.isPending}
                  type="button"
                  onClick={() => saveTreeMutation.mutate()}
                >
                  {saveTreeMutation.isPending ? "Saving" : "Save tree"}
                </Button>
              </header>
              <div className="menu-node-list">
                {flatNodes.length === 0 ? (
                  <p>No menu nodes yet.</p>
                ) : (
                  flatNodes.map((entry) => (
                    <article
                      key={entry.node.id}
                      style={{ paddingLeft: `${entry.depth * 18 + 10}px` }}
                    >
                      <div>
                        <strong>{entry.node.title}</strong>
                        <span>{describeNode(entry.node)}</span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setNodes((current) => moveFlatNode(current, entry.node.id ?? "", -1))
                          }
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNodes((current) => moveFlatNode(current, entry.node.id ?? "", 1))
                          }
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNodes((current) => indentNode(current, entry.node.id ?? ""))
                          }
                        >
                          In
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNodes((current) => outdentNode(current, entry.node.id ?? ""))
                          }
                        >
                          Out
                        </button>
                        <button type="button" onClick={() => editNode(entry.node)}>
                          <CmsIcon name="edit" />
                        </button>
                        <button type="button" onClick={() => removeNode(entry.node.id ?? "")}>
                          <CmsIcon name="trash" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </Card>

          <Card className="menu-builder-panel">
            <NodeEditor
              form={nodeForm}
              resources={resources}
              resourceSearch={resourceSearch}
              onApplyResource={applyResource}
              onChange={setNodeForm}
              onResourceSearch={setResourceSearch}
              onSubmit={handleNodeSubmit}
            />
          </Card>
        </PermissionGate>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Move this menu and its nodes to deleted status?"
        isOpen={Boolean(pendingDeleteId)}
        isPending={deleteMutation.isPending}
        title="Delete menu"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            deleteMutation.mutate(pendingDeleteId);
          }
        }}
      />
    </section>
  );
}

function NodeEditor({
  form,
  onApplyResource,
  onChange,
  onResourceSearch,
  onSubmit,
  resourceSearch,
  resources,
}: {
  form: NodeFormState;
  onApplyResource: (resource: LinkableResource) => void;
  onChange: (form: NodeFormState) => void;
  onResourceSearch: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resourceSearch: string;
  resources: LinkableResource[];
}) {
  const isResourceLink = ["page", "post", "category", "tag"].includes(form.linkType);

  return (
    <section>
      <header className="menu-builder-header">
        <div>
          <p>Node</p>
          <h3>{form.id ? "Edit node" : "New node"}</h3>
        </div>
        <Button type="button" variant="secondary" onClick={() => onChange(emptyNodeForm)}>
          <CmsIcon name="plus" />
          New
        </Button>
      </header>
      <form className="menu-form" onSubmit={onSubmit}>
        <label>
          Title
          <Input
            required
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Link type
            <select
              value={form.linkType}
              onChange={(event) => {
                const linkType = event.target.value as AdminMenuNodeLinkType;
                onChange({
                  ...form,
                  linkType,
                  resourceId: null,
                  resourceType: isResourceType(linkType) ? linkType : null,
                  url: linkType === "custom" ? form.url : "",
                });
              }}
            >
              {linkTypes.map((linkType) => (
                <option key={linkType} value={linkType}>
                  {linkType}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target
            <select
              value={form.target}
              onChange={(event) =>
                onChange({ ...form, target: event.target.value as "_blank" | "_self" })
              }
            >
              <option value="_self">_self</option>
              <option value="_blank">_blank</option>
            </select>
          </label>
        </div>
        {form.linkType === "custom" && (
          <label>
            URL
            <Input
              required
              value={form.url ?? ""}
              onChange={(event) => onChange({ ...form, url: event.target.value })}
            />
          </label>
        )}
        {isResourceLink && (
          <div className="resource-picker">
            <label>
              Search resources
              <Input
                value={resourceSearch}
                onChange={(event) => onResourceSearch(event.target.value)}
              />
            </label>
            <div>
              {resources
                .filter((resource) => resource.type === form.linkType)
                .map((resource) => (
                  <button
                    key={`${resource.type}-${resource.id}`}
                    type="button"
                    onClick={() => onApplyResource(resource)}
                  >
                    <strong>{resource.title}</strong>
                    <span>
                      {resource.type} · {resource.status}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
        <div className="form-grid">
          <label>
            Icon
            <Input
              value={form.icon ?? ""}
              onChange={(event) => onChange({ ...form, icon: event.target.value })}
            />
          </label>
          <label>
            CSS class
            <Input
              value={form.cssClass ?? ""}
              onChange={(event) => onChange({ ...form, cssClass: event.target.value })}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Rel
            <Input
              value={form.rel ?? ""}
              onChange={(event) => onChange({ ...form, rel: event.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                onChange({ ...form, status: event.target.value as AdminMenuStatus })
              }
            >
              {nodeStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit">{form.id ? "Save node" : "Add node"}</Button>
      </form>
    </section>
  );
}

function toMenuForm(menu: AdminMenuDetail): MenuFormState {
  return {
    description: menu.description ?? "",
    id: menu.id,
    location: menu.location,
    name: menu.name,
    slug: menu.slug,
    status: menu.status as AdminMenuStatus,
  };
}

function toNodeInputs(nodes: AdminMenuNode[]): MenuNodeInput[] {
  return nodes.map((node) => ({
    children: toNodeInputs(node.children),
    cssClass: node.cssClass ?? "",
    icon: node.icon ?? "",
    id: node.id,
    linkType: node.linkType as AdminMenuNodeLinkType,
    rel: node.rel ?? "",
    resourceId: node.resourceId,
    resourceType: node.resourceType,
    sortOrder: node.sortOrder,
    status: node.status as AdminMenuStatus,
    target: node.target as "_blank" | "_self",
    title: node.title,
    url: node.url ?? "",
  }));
}

function normalizeTree(nodes: MenuNodeInput[]): MenuNodeInput[] {
  return nodes.map((node, index) => ({
    ...normalizeNodeForm({ ...emptyNodeForm, ...node, id: node.id ?? crypto.randomUUID() }),
    children: normalizeTree(node.children ?? []),
    sortOrder: index,
  }));
}

function normalizeNodeForm(form: NodeFormState): MenuNodeInput {
  const linkType = form.linkType;
  const resourceType = isResourceType(linkType) ? linkType : null;

  return {
    children: form.children ?? [],
    cssClass: form.cssClass || null,
    icon: form.icon || null,
    id: form.id || undefined,
    linkType,
    rel: form.rel || null,
    resourceId: resourceType ? form.resourceId : null,
    resourceType,
    status: form.status,
    target: form.target,
    title: form.title,
    url: linkType === "custom" ? form.url || "" : null,
  };
}

function flattenForUi(
  nodes: MenuNodeInput[],
  depth = 0,
): Array<{ depth: number; node: MenuNodeInput }> {
  return nodes.flatMap((node) => [
    { depth, node },
    ...flattenForUi(node.children ?? [], depth + 1),
  ]);
}

function replaceNode(nodes: MenuNodeInput[], replacement: MenuNodeInput): MenuNodeInput[] {
  return nodes.map((node) => {
    if (node.id === replacement.id) {
      return { ...replacement, children: node.children ?? [] };
    }

    return { ...node, children: replaceNode(node.children ?? [], replacement) };
  });
}

function removeNodeById(nodes: MenuNodeInput[], nodeId: string): MenuNodeInput[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, children: removeNodeById(node.children ?? [], nodeId) }));
}

function moveFlatNode(nodes: MenuNodeInput[], nodeId: string, direction: -1 | 1): MenuNodeInput[] {
  const index = nodes.findIndex((node) => node.id === nodeId);

  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) {
      return nodes;
    }
    const next = [...nodes];
    const [item] = next.splice(index, 1);
    if (!item) {
      return nodes;
    }
    next.splice(target, 0, item);
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    children: moveFlatNode(node.children ?? [], nodeId, direction),
  }));
}

function indentNode(nodes: MenuNodeInput[], nodeId: string): MenuNodeInput[] {
  const index = nodes.findIndex((node) => node.id === nodeId);

  if (index > 0) {
    const next = [...nodes];
    const [node] = next.splice(index, 1);
    const previous = next[index - 1];
    if (!node || !previous) {
      return nodes;
    }
    previous.children = [...(previous.children ?? []), node];
    return next;
  }

  return nodes.map((node) => ({ ...node, children: indentNode(node.children ?? [], nodeId) }));
}

function outdentNode(nodes: MenuNodeInput[], nodeId: string): MenuNodeInput[] {
  return nodes.flatMap((node) => {
    const children = node.children ?? [];
    const index = children.findIndex((child) => child.id === nodeId);

    if (index >= 0) {
      const nextChildren = [...children];
      const [child] = nextChildren.splice(index, 1);

      return child ? [{ ...node, children: nextChildren }, child] : [node];
    }

    return [{ ...node, children: outdentNode(children, nodeId) }];
  });
}

function describeNode(node: MenuNodeInput) {
  if (node.linkType === "custom") {
    return node.url || "Custom URL";
  }

  if (node.linkType === "label") {
    return "Label";
  }

  return `${node.linkType}: ${node.resourceId ?? "No resource"}`;
}

function isResourceType(value: string): value is AdminMenuResourceType {
  return ["category", "page", "post", "tag"].includes(value);
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
