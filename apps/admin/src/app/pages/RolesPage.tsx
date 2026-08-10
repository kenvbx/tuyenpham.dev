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
import { useToast } from "../components/toast-context";
import {
  createRole,
  deleteRole,
  listPermissionCatalog,
  listRoles,
  updateRole,
  type AdminRole,
  type PermissionCatalogItem,
  type RoleFormInput,
} from "../lib/api";

type RoleFormState = RoleFormInput & {
  id?: string;
};

const emptyForm: RoleFormState = {
  description: "",
  isDefault: false,
  isSystem: false,
  name: "",
  permissionIds: [],
  slug: "",
};

export function RolesPage() {
  const auth = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const token = auth.token ?? "";
  const rolesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listRoles(token),
    queryKey: ["roles", "all"],
  });
  const permissionsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listPermissionCatalog(token),
    queryKey: ["permissions", "catalog"],
  });
  const saveRoleMutation = useMutation({
    mutationFn: (input: RoleFormState) =>
      input.id ? updateRole(token, input.id, input) : createRole(token, input),
    onSuccess: async () => {
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify({
        message: "Role definition has been saved.",
        title: "Role saved",
        variant: "success",
      });
    },
  });
  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(token, roleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify({ message: "Role has been deleted.", title: "Role deleted", variant: "success" });
    },
  });
  const bulkDeleteRolesMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      await Promise.all(roleIds.map((roleId) => deleteRole(token, roleId)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      notify({
        message: "Selected roles have been deleted.",
        title: "Bulk action complete",
        variant: "success",
      });
    },
  });

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const error =
    rolesQuery.error ??
    permissionsQuery.error ??
    saveRoleMutation.error ??
    deleteRoleMutation.error ??
    bulkDeleteRolesMutation.error;
  const roleColumns: DataTableColumn<AdminRole>[] = [
    {
      header: "Role",
      id: "role",
      render: (role) => (
        <>
          <strong>{role.name}</strong>
          <span>{role.slug}</span>
        </>
      ),
      sortable: true,
      sortValue: (role) => role.name,
    },
    {
      header: "Flags",
      id: "flags",
      render: (role) => (
        <div className="flag-list">
          {role.isSystem && <span className="status-pill">system</span>}
          {role.isDefault && <span className="status-pill status-pill--active">default</span>}
        </div>
      ),
    },
    {
      header: "Permissions",
      id: "permissions",
      render: (role) => `${role.permissions.length} permissions`,
      sortable: true,
      sortValue: (role) => role.permissions.length,
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (role) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.ROLES_EDIT}>
            <button aria-label={`Edit ${role.name}`} type="button" onClick={() => editRole(role)}>
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.ROLES_DELETE}>
            <button
              aria-label={`Delete ${role.name}`}
              disabled={deleteRoleMutation.variables === role.id || role.isSystem}
              type="button"
              onClick={() => setPendingDeleteIds([role.id])}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveRoleMutation.mutate(form);
  }

  function editRole(role: AdminRole) {
    setForm({
      description: role.description ?? "",
      id: role.id,
      isDefault: role.isDefault,
      isSystem: role.isSystem,
      name: role.name,
      permissionIds: role.permissions.map((permission) => permission.id),
      slug: role.slug,
    });
  }

  return (
    <section className="roles-page">
      <PageHeader
        eyebrow="System"
        title="Role management"
        actions={
          <PermissionGate permission={Permission.ROLES_CREATE}>
            <Button onClick={() => setForm(emptyForm)}>
              <CmsIcon name="plus" />
              New role
            </Button>
          </PermissionGate>
        }
      />

      {error && <ErrorState error={error} fallback="Unable to load roles." />}

      <div className="roles-layout">
        <Card className="table-panel">
          <DataTable
            columns={roleColumns}
            data={roles}
            emptyDescription="Create a role to assign permissions."
            emptyTitle="No roles found"
            getRowKey={(role) => role.id}
            isLoading={rolesQuery.isLoading}
            loadingDescription="Fetching role definitions."
            loadingTitle="Loading roles"
            selectable
            bulkActions={[
              {
                label: bulkDeleteRolesMutation.isPending ? "Deleting" : "Delete selected",
                onClick: (selectedIds) => {
                  const mutableRoleIds = roles
                    .filter((role) => selectedIds.includes(role.id) && !role.isSystem)
                    .map((role) => role.id);

                  if (mutableRoleIds.length > 0) {
                    setPendingDeleteIds(mutableRoleIds);
                  }
                },
                variant: "danger",
              },
            ]}
          />
        </Card>

        <PermissionGate permission={form.id ? Permission.ROLES_EDIT : Permission.ROLES_CREATE}>
          <Card className="form-panel">
            <RoleForm
              form={form}
              isSaving={saveRoleMutation.isPending}
              onChange={setForm}
              onSubmit={handleSubmit}
              permissions={permissions}
            />
          </Card>
        </PermissionGate>
      </div>
      <ConfirmDialog
        confirmLabel="Delete"
        description={`Delete ${pendingDeleteIds.length} selected role${pendingDeleteIds.length === 1 ? "" : "s"}?`}
        isOpen={pendingDeleteIds.length > 0}
        isPending={deleteRoleMutation.isPending || bulkDeleteRolesMutation.isPending}
        title="Delete roles"
        onClose={() => setPendingDeleteIds([])}
        onConfirm={() => {
          if (pendingDeleteIds.length === 1) {
            const targetId = pendingDeleteIds[0];

            if (targetId) {
              deleteRoleMutation.mutate(targetId);
            }
          } else {
            bulkDeleteRolesMutation.mutate(pendingDeleteIds);
          }
          setPendingDeleteIds([]);
        }}
      />
    </section>
  );
}

function RoleForm({
  form,
  isSaving,
  onChange,
  onSubmit,
  permissions,
}: {
  form: RoleFormState;
  isSaving: boolean;
  onChange: (form: RoleFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  permissions: PermissionCatalogItem[];
}) {
  const selectedPermissions = useMemo(() => new Set(form.permissionIds), [form.permissionIds]);
  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);

  function togglePermission(permissionId: string) {
    onChange({
      ...form,
      permissionIds: selectedPermissions.has(permissionId)
        ? form.permissionIds.filter((currentPermissionId) => currentPermissionId !== permissionId)
        : [...form.permissionIds, permissionId],
    });
  }

  return (
    <form className="role-form" onSubmit={onSubmit}>
      <div>
        <p>{form.id ? "Edit role" : "Create role"}</p>
        <h3>{form.id ? form.name : "New admin role"}</h3>
      </div>

      <div className="form-grid">
        <label>
          Name
          <Input
            required
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Slug
          <Input
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            value={form.slug}
            onChange={(event) => onChange({ ...form, slug: event.target.value })}
          />
        </label>
      </div>

      <label>
        Description
        <Input
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </label>

      <div className="toggle-row">
        <label>
          <input
            checked={form.isDefault}
            type="checkbox"
            onChange={(event) => onChange({ ...form, isDefault: event.target.checked })}
          />
          Default role
        </label>
        <label>
          <input
            checked={form.isSystem}
            type="checkbox"
            onChange={(event) => onChange({ ...form, isSystem: event.target.checked })}
          />
          System role
        </label>
      </div>

      <fieldset>
        <legend>Permissions</legend>
        <div className="permission-matrix">
          {permissionGroups.map((group) => (
            <section key={group.name}>
              <h4>{group.name}</h4>
              {group.permissions.map((permission) => (
                <label key={permission.id}>
                  <input
                    checked={selectedPermissions.has(permission.id)}
                    type="checkbox"
                    onChange={() => togglePermission(permission.id)}
                  />
                  <span>
                    <strong>{permission.name}</strong>
                    <small>{permission.flag}</small>
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>
      </fieldset>

      <Button disabled={isSaving} type="submit">
        {isSaving ? "Saving" : form.id ? "Save changes" : "Create role"}
      </Button>
    </form>
  );
}

function groupPermissions(permissions: PermissionCatalogItem[]) {
  const groups = new Map<string, PermissionCatalogItem[]>();

  for (const permission of permissions) {
    groups.set(permission.groupName, [...(groups.get(permission.groupName) ?? []), permission]);
  }

  return [...groups.entries()].map(([name, groupedPermissions]) => ({
    name,
    permissions: groupedPermissions,
  }));
}
