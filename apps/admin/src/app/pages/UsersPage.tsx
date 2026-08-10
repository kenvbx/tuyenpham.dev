import { Permission } from "@cms/shared";
import { Button, Card, CmsIcon, EmptyState, Input } from "@cms/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
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

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const roles = rolesQuery.data ?? [];
  const error =
    usersQuery.error ?? rolesQuery.error ?? saveUserMutation.error ?? disableUserMutation.error;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
      <div className="module-header">
        <div>
          <p>System</p>
          <h2>User management</h2>
        </div>
        <PermissionGate permission={Permission.USERS_CREATE}>
          <Button onClick={() => setForm(emptyForm)}>
            <CmsIcon name="plus" />
            New user
          </Button>
        </PermissionGate>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <label className="search-field">
          <CmsIcon name="search" />
          <Input name="search" placeholder="Search users" defaultValue={filters.search} />
        </label>
        <select name="status" defaultValue={filters.status}>
          <option value="">All status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {error && (
        <p className="form-alert" role="alert">
          {error instanceof Error ? error.message : "Unable to load users."}
        </p>
      )}

      <div className="users-layout">
        <Card className="table-panel">
          {usersQuery.isLoading ? (
            <EmptyState title="Loading users" description="Fetching admin user records." />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" description="Create the first admin account here." />
          ) : (
            <UsersTable
              disablingUserId={disableUserMutation.variables}
              onDisable={(userId) => disableUserMutation.mutate(userId)}
              onEdit={editUser}
              users={users}
            />
          )}
          {pagination && (
            <PaginationControls
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              page={pagination.page}
              pageCount={pagination.pageCount}
              total={pagination.total}
            />
          )}
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

function UsersTable({
  disablingUserId,
  onDisable,
  onEdit,
  users,
}: {
  disablingUserId?: string | undefined;
  onDisable: (userId: string) => void;
  onEdit: (user: AdminUser) => void;
  users: AdminUser[];
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Last login</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.displayName ?? user.email}</strong>
                <span>{user.email}</span>
              </td>
              <td>
                <span className={`status-pill status-pill--${user.status}`}>{user.status}</span>
              </td>
              <td>{user.roles.map((role) => role.name).join(", ") || "No role"}</td>
              <td>{formatDate(user.lastLoginAt)}</td>
              <td>
                <div className="row-actions">
                  <PermissionGate permission={Permission.USERS_EDIT}>
                    <button
                      aria-label={`Edit ${user.email}`}
                      type="button"
                      onClick={() => onEdit(user)}
                    >
                      <CmsIcon name="edit" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={Permission.USERS_DELETE}>
                    <button
                      aria-label={`Disable ${user.email}`}
                      disabled={disablingUserId === user.id || user.status === "inactive"}
                      type="button"
                      onClick={() => onDisable(user.id)}
                    >
                      <CmsIcon name="trash" />
                    </button>
                  </PermissionGate>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function PaginationControls({
  onPageChange,
  page,
  pageCount,
  total,
}: {
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <div className="pagination">
      <span>{total} users</span>
      <div>
        <button disabled={page <= 1} type="button" onClick={() => onPageChange(page - 1)}>
          <CmsIcon name="chevronLeft" />
        </button>
        <strong>
          {page} / {Math.max(pageCount, 1)}
        </strong>
        <button disabled={page >= pageCount} type="button" onClick={() => onPageChange(page + 1)}>
          <CmsIcon name="chevronRight" />
        </button>
      </div>
    </div>
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
