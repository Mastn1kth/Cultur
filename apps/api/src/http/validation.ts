import type { NextFunction, Request, Response } from "express";
import { z, type ZodSchema } from "zod";

/**
 * Middleware для валидации тела запроса с помощью Zod схемы
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware для валидации query параметров с помощью Zod схемы
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware для валидации параметров пути с помощью Zod схемы
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Общие схемы для переиспользования
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
  cursor: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
};

/**
 * Универсальная функция для cursor-based пагинации SQL запросов.
 * Добавляет WHERE и LIMIT для пагинации по указанному полю.
 */
export function withCursorPagination(
  baseSql: string,
  cursor?: string | null,
  limit: number = 10,
  cursorField: string = "created_at",
  cursorDirection: "ASC" | "DESC" = "DESC"
): { sql: string; params: unknown[] } {
  const hasWhere = /WHERE\s/i.test(baseSql);
  const cursorClause = cursor
    ? `${hasWhere ? " AND" : " WHERE"} ${cursorField} ${cursorDirection === "DESC" ? "<" : ">"} $last`
    : "";
  const orderClause = `ORDER BY ${cursorField} ${cursorDirection}`;
  return {
    sql: `${baseSql}${cursorClause} ${orderClause} LIMIT $last`.replace(
      cursor ? /\$last/g : /\$last/g,
      cursor ? "::timestamptz" : ""
    ),
    params: cursor ? [cursor] : [],
  };
}

export function paginatedResponse<T>(rows: T[], limit: number): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1] as Record<string, unknown> | undefined;
  const nextCursor = hasMore && last ? String(last.created_at ?? "") : null;
  return { items, nextCursor: nextCursor || null };
}
