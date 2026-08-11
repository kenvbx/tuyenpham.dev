import {
  createApiListResponse,
  createApiSuccessResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { postService, type PostService } from "./post.service.js";
import type { PostSummary } from "./post.types.js";

const postStatusSchema = z.enum(["archived", "deleted", "draft", "published", "scheduled"]);
const writablePostStatusSchema = z.enum(["archived", "draft", "published", "scheduled"]);
const seoBodySchema = z.object({
  canonicalUrl: z.url().nullable().optional(),
  metaDescription: z.string().trim().max(320).nullable().optional(),
  metaTitle: z.string().trim().max(160).nullable().optional(),
  nofollow: z.boolean().optional(),
  noindex: z.boolean().optional(),
  ogDescription: z.string().trim().max(320).nullable().optional(),
  ogImageId: z.string().uuid().nullable().optional(),
  ogImageUrl: z.url().nullable().optional(),
  ogTitle: z.string().trim().max(160).nullable().optional(),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});
const postBodySchema = z.object({
  categoryIds: z.array(z.string().uuid()).default([]),
  contentHtml: z.string().nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()).nullable().optional(),
  contentText: z.string().nullable().optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  featuredImageId: z.string().uuid().nullable().optional(),
  publishedAt: z.iso.datetime().nullable().optional(),
  relatedPostIds: z.array(z.string().uuid()).default([]),
  seo: seoBodySchema.optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(160)
    .optional(),
  status: writablePostStatusSchema.optional(),
  tagIds: z.array(z.string().uuid()).default([]),
  title: z.string().trim().min(1).max(255),
});
const updatePostBodySchema = postBodySchema.partial();
const updatePostStatusBodySchema = z.object({
  publishedAt: z.iso.datetime().nullable().optional(),
  status: writablePostStatusSchema,
});
const postParamsSchema = z.object({
  postId: z.string().uuid(),
});
const revisionParamsSchema = postParamsSchema.extend({
  revisionId: z.string().uuid(),
});
const listPostsQuerySchema = listQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  status: postStatusSchema.optional(),
  tagId: z.string().uuid().optional(),
});

export type PostRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  posts?: PostService;
};

export function createPostRouter(options: PostRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const posts = options.posts ?? postService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = listPostsQuerySchema.parse(request.query);
        const result = await posts.listPosts(query);
        const body: ApiListResponse<PostSummary> = createApiListResponse(
          result.data,
          result.pagination,
        );

        response.json(body);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:postId",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = postParamsSchema.parse(request.params);
        const post = await posts.getPost(params.postId);

        response.json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:postId/revisions",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = postParamsSchema.parse(request.params);
        const revisions = await posts.listRevisions(params.postId);

        response.json(createApiSuccessResponse(revisions));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:postId/revisions/:revisionId/restore",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = revisionParamsSchema.parse(request.params);
        const post = await posts.restoreRevision(
          params.postId,
          params.revisionId,
          request.auth?.user.id ?? null,
        );

        await audit.log({
          action: "blog-posts.revisions.restore",
          actorId: request.auth?.user.id ?? null,
          afterData: { revisionId: params.revisionId },
          entityId: post.id,
          entityType: "blog-post",
          ipAddress: request.ip,
          metadata: { revisionId: params.revisionId, title: post.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = postBodySchema.parse(request.body);
        const post = await posts.createPost({
          ...body,
          authorId: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "blog-posts.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: post.id,
          entityType: "blog-post",
          ipAddress: request.ip,
          metadata: { slug: post.slug?.key, status: post.status, title: post.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:postId/status",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_PUBLISH, permissions),
    async (request, response, next) => {
      try {
        const params = postParamsSchema.parse(request.params);
        const body = updatePostStatusBodySchema.parse(request.body);
        const post = await posts.updatePostStatus(params.postId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "blog-posts.status.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: post.id,
          entityType: "blog-post",
          ipAddress: request.ip,
          metadata: { publishedAt: post.publishedAt, status: post.status, title: post.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:postId",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = postParamsSchema.parse(request.params);
        const body = updatePostBodySchema.parse(request.body);
        const post = await posts.updatePost(params.postId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "blog-posts.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: post.id,
          entityType: "blog-post",
          ipAddress: request.ip,
          metadata: { slug: post.slug?.key, status: post.status, title: post.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:postId",
    requireAuth(auth),
    requirePermission(Permission.BLOG_POSTS_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = postParamsSchema.parse(request.params);
        const post = await posts.deletePost(params.postId);

        await audit.log({
          action: "blog-posts.delete",
          actorId: request.auth?.user.id ?? null,
          afterData: { status: post.status },
          entityId: post.id,
          entityType: "blog-post",
          ipAddress: request.ip,
          metadata: { title: post.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(post));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
