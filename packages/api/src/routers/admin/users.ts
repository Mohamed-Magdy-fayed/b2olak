import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import {
  localeValues,
  UsersTable,
  userStatusValues,
} from "@workspace/db/schemas/auth/users";

import { adminProcedure, createTRPCRouter } from "../../init";
import {
  dateBounds,
  EXPORT_ROW_CAP,
  facetValues,
  isDateRangeValue,
  pageMath,
  tableExportInputSchema,
  tableListInputSchema,
} from "../../lib/table-query";

/** Customer management — server-mode data table (journey A4). */

function usersWhere(input: {
  columnFilters: { id: string; value: unknown }[];
  globalFilter?: string;
}): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    isNull(UsersTable.deletedAt),
    eq(UsersTable.role, "customer"),
  ];

  for (const filter of input.columnFilters) {
    if (filter.id === "status") {
      const values = facetValues(filter.value, userStatusValues);
      if (values.length) conditions.push(inArray(UsersTable.status, values));
    } else if (filter.id === "preferredLocale") {
      const values = facetValues(filter.value, localeValues);
      if (values.length) {
        conditions.push(inArray(UsersTable.preferredLocale, values));
      }
    } else if (filter.id === "phoneVerifiedAt") {
      const values = facetValues(filter.value, ["true", "false"] as const);
      if (values.length === 1) {
        conditions.push(
          values[0] === "true"
            ? isNotNull(UsersTable.phoneVerifiedAt)
            : isNull(UsersTable.phoneVerifiedAt),
        );
      }
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const { from, to } = dateBounds(filter.value);
      if (from) conditions.push(gte(UsersTable.createdAt, from));
      if (to) conditions.push(lte(UsersTable.createdAt, to));
    } else if (filter.id === "lastSignInAt" && isDateRangeValue(filter.value)) {
      const { from, to } = dateBounds(filter.value);
      if (from) conditions.push(gte(UsersTable.lastSignInAt, from));
      if (to) conditions.push(lte(UsersTable.lastSignInAt, to));
    }
  }

  const q = input.globalFilter?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(UsersTable.name, pattern),
        ilike(UsersTable.phone, pattern),
        ilike(UsersTable.email, pattern),
      ),
    );
  }

  return and(...conditions);
}

const USER_SORTABLE = {
  name: UsersTable.name,
  createdAt: UsersTable.createdAt,
  lastSignInAt: UsersTable.lastSignInAt,
  status: UsersTable.status,
} as const;

function usersOrderBy(sorting: { id: string; desc: boolean }[]) {
  const explicit = sorting
    .filter((s): s is { id: keyof typeof USER_SORTABLE; desc: boolean } =>
      s.id in USER_SORTABLE,
    )
    .map((s) =>
      s.desc ? desc(USER_SORTABLE[s.id]) : asc(USER_SORTABLE[s.id]),
    );
  return explicit.length ? explicit : [desc(UsersTable.createdAt)];
}

const userRowColumns = {
  id: true,
  name: true,
  phone: true,
  email: true,
  status: true,
  preferredLocale: true,
  phoneVerifiedAt: true,
  lastSignInAt: true,
  createdAt: true,
} as const;

export const adminUsersRouter = createTRPCRouter({
  list: adminProcedure
    .input(tableListInputSchema)
    .query(async ({ ctx, input }) => {
      const where = usersWhere(input);

      const [{ value: total } = { value: 0 }] = await ctx.db
        .select({ value: count() })
        .from(UsersTable)
        .where(where);

      const { pageCount, offset } = pageMath(total, input.page, input.perPage);

      const rows = await ctx.db.query.UsersTable.findMany({
        where,
        columns: userRowColumns,
        orderBy: usersOrderBy(input.sorting),
        offset,
        limit: input.perPage,
      });

      return { rows, pageCount, total };
    }),

  exportRows: adminProcedure
    .input(tableExportInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.UsersTable.findMany({
        where: usersWhere(input),
        columns: userRowColumns,
        orderBy: usersOrderBy(input.sorting),
        limit: EXPORT_ROW_CAP,
      });

      return {
        rows: rows.map((user) => ({
          name: user.name ?? "",
          phone: user.phone ?? "",
          email: user.email ?? "",
          status: user.status,
          locale: user.preferredLocale,
          phoneVerified: user.phoneVerifiedAt !== null,
          lastSignInAt: user.lastSignInAt?.toISOString() ?? "",
          createdAt: user.createdAt.toISOString(),
        })),
      };
    }),

  /** Suspension drops every session immediately (web cookie + mobile bearer). */
  setStatus: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.uuid()).min(1).max(100),
        status: z.enum(userStatusValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targets = await ctx.db.query.UsersTable.findMany({
        where: and(
          inArray(UsersTable.id, input.userIds),
          eq(UsersTable.role, "customer"),
          isNull(UsersTable.deletedAt),
        ),
        columns: { id: true },
      });
      if (!targets.length) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(UsersTable)
        .set({ status: input.status, updatedBy: ctx.session.user.id })
        .where(
          inArray(
            UsersTable.id,
            targets.map((t) => t.id),
          ),
        );

      if (input.status === "suspended") {
        const { deleteAllSessionsForUser } = await import(
          "@workspace/auth/session"
        );
        await Promise.all(
          targets.map((t) => deleteAllSessionsForUser(t.id)),
        );
      }

      return { ok: true as const, count: targets.length };
    }),
});
