import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { ValidationSummary } from "../components/ValidationSummary";
import {
  createUser,
  disableUser,
  listRoles,
  listUsers,
  updateUser,
  type AdminRole,
  type AdminUser,
  type UserFormInput,
} from "../lib/api";

const statusOptions = ["active", "inactive", "suspended"] as const;

type UserFormState = UserFormInput & {
  id?: string;
};

const emptyForm: UserFormState = {
  displayName: "",
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  roleIds: [],
  status: "active",
};

export function UsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ page: 1, perPage: 10, search: "", status: "" });
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const token = auth.token ?? "";
  const usersQueryKey = ["users", filters];

  const usersQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () =>
      listUsers(token, {
        page: filters.page,
        perPage: filters.perPage,
        search: filters.search || undefined,
        status: filters.status || undefined,
      }),
    queryKey: usersQueryKey,
  });
  const rolesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listRoles(token),
    queryKey: ["roles", "all"],
  });

  const saveUserMutation = useMutation({
    mutationFn: async (input: UserFormState) => {
      if (input.id) {
        const payload = {
          displayName: input.displayName,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          roleIds: input.roleIds,
          status: input.status,
        };

        return updateUser(token, input.id, payload);
      }

      return createUser(token, input);
    },
    onSuccess: async () => {
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const disableUserMutation = useMutation({
    mutationFn: (userId: string) => disableUser(token, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const bulkDisableUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      await Promise.all(userIds.map((userId) => disableUser(token, userId)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const roles = rolesQuery.data ?? [];
  const error =
    usersQuery.error ??
    rolesQuery.error ??
    saveUserMutation.error ??
    disableUserMutation.error ??
    bulkDisableUsersMutation.error;

  const userColumns: DataTableColumn<AdminUser>[] = [
    {
      header: "User",
      id: "user",
      render: (user) => (
        <>
          <strong>{user.displayName ?? user.email}</strong>
          <span>{user.email}</span>
        </>
      ),
      sortable: true,
      sortValue: (user) => user.displayName ?? user.email,
    },
    {
      header: "Status",
      id: "status",
      render: (user) => (
        <span className={`status-pill status-pill--${user.status}`}>{user.status}</span>
      ),
      sortable: true,
      sortValue: (user) => user.status,
    },
    {
      header: "Roles",
      id: "roles",
      render: (user) => user.roles.map((role) => role.name).join(", ") || "No role",
    },
    {
      header: "Last login",
      id: "lastLogin",
      render: (user) => formatDate(user.lastLoginAt),
      sortable: true,
      sortValue: (user) => user.lastLoginAt ?? "",
    },
    {
      align: "right",
      header: "Actions",
      id: "actions",
      render: (user) => (
        <div className="row-actions">
          <PermissionGate permission={Permission.USERS_EDIT}>
            <button aria-label={`Edit ${user.email}`} type="button" onClick={() => editUser(user)}>
              <CmsIcon name="edit" />
            </button>
          </PermissionGate>
          <PermissionGate permission={Permission.USERS_DELETE}>
            <button
              aria-label={`Disable ${user.email}`}
              disabled={disableUserMutation.variables === user.id || user.status === "inactive"}
              type="button"
              onClick={() => disableUserMutation.mutate(user.id)}
            >
              <CmsIcon name="trash" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  function handleSearch(formData: FormData) {
    setFilters((current) => ({
      ...current,
      page: 1,
      search: String(formData.get("search") ?? ""),
      status: String(formData.get("status") ?? ""),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveUserMutation.mutate(form);
  }

  function editUser(user: AdminUser) {
    setForm({
      displayName: user.displayName ?? "",
      email: user.email,
      firstName: user.firstName ?? "",
      id: user.id,
      lastName: user.lastName ?? "",
      password: "",
      roleIds: user.roles.map((role) => role.id),
      status: user.status as UserFormState["status"],
    });
  }

  return (
    <section className="users-page">
      <PageHeader
        eyebrow="System"
        title="User management"
        actions={
          <PermissionGate permission={Permission.USERS_CREATE}>
            <Button onClick={() => setForm(emptyForm)}>
              <CmsIcon name="plus" />
              New user
            </Button>
          </PermissionGate>
        }
      />

      {error && <ValidationSummary error={error} fallback="Unable to load users." />}

      <div className="users-layout">
        <Card className="table-panel">
          <DataTable
            columns={userColumns}
            data={users}
            emptyDescription="Create the first admin account here."
            emptyTitle="No users found"
            filters={
              <select name="status" defaultValue={filters.status}>
                <option value="">All status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            }
            getRowKey={(user) => user.id}
            isLoading={usersQuery.isLoading}
            loadingDescription="Fetching admin user records."
            loadingTitle="Loading users"
            onSearch={handleSearch}
            selectable
            bulkActions={[
              {
                label: bulkDisableUsersMutation.isPending ? "Disabling" : "Disable selected",
                onClick: (selectedIds) => {
                  const activeUserIds = users
                    .filter((user) => selectedIds.includes(user.id) && user.status !== "inactive")
                    .map((user) => user.id);

                  if (activeUserIds.length > 0) {
                    bulkDisableUsersMutation.mutate(activeUserIds);
                  }
                },
                variant: "danger",
              },
            ]}
            pagination={
              pagination
                ? {
                    label: `${pagination.total} users`,
                    onPageChange: (page) => setFilters((current) => ({ ...current, page })),
                    page: pagination.page,
                    pageCount: pagination.pageCount,
                  }
                : undefined
            }
            searchDefaultValue={filters.search}
            searchPlaceholder="Search users"
          />
        </Card>

        <PermissionGate permission={form.id ? Permission.USERS_EDIT : Permission.USERS_CREATE}>
          <Card className="form-panel">
            <UserForm
              form={form}
              isSaving={saveUserMutation.isPending}
              onChange={setForm}
              onSubmit={handleSubmit}
              roles={roles}
            />
          </Card>
        </PermissionGate>
      </div>
    </section>
  );
}

function UserForm({
  form,
  isSaving,
  onChange,
  onSubmit,
  roles,
}: {
  form: UserFormState;
  isSaving: boolean;
  onChange: (form: UserFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  roles: AdminRole[];
}) {
  const selectedRoles = useMemo(() => new Set(form.roleIds), [form.roleIds]);

  function toggleRole(roleId: string) {
    onChange({
      ...form,
      roleIds: selectedRoles.has(roleId)
        ? form.roleIds.filter((currentRoleId) => currentRoleId !== roleId)
        : [...form.roleIds, roleId],
    });
  }

  return (
    <form className="user-form" onSubmit={onSubmit}>
      <div>
        <p>{form.id ? "Edit user" : "Create user"}</p>
        <h3>{form.id ? form.email : "New admin user"}</h3>
      </div>

      <label>
        Email
        <Input
          required
          type="email"
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
      </label>

      {!form.id && (
        <label>
          Password
          <Input
            minLength={8}
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
          />
        </label>
      )}

      <div className="form-grid">
        <label>
          First name
          <Input
            value={form.firstName}
            onChange={(event) => onChange({ ...form, firstName: event.target.value })}
          />
        </label>
        <label>
          Last name
          <Input
            value={form.lastName}
            onChange={(event) => onChange({ ...form, lastName: event.target.value })}
          />
        </label>
      </div>

      <label>
        Display name
        <Input
          value={form.displayName}
          onChange={(event) => onChange({ ...form, displayName: event.target.value })}
        />
      </label>

      <label>
        Status
        <select
          value={form.status}
          onChange={(event) =>
            onChange({ ...form, status: event.target.value as UserFormState["status"] })
          }
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Roles</legend>
        <div className="role-checklist">
          {roles.map((role) => (
            <label key={role.id}>
              <input
                checked={selectedRoles.has(role.id)}
                type="checkbox"
                onChange={() => toggleRole(role.id)}
              />
              <span>
                <strong>{role.name}</strong>
                <small>{role.slug}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button disabled={isSaving} type="submit">
        {isSaving ? "Saving" : form.id ? "Save changes" : "Create user"}
      </Button>
    </form>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
