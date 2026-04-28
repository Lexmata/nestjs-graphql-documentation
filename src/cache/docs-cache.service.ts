import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SchemaHarvesterService } from '../harvest/schema-harvester.service.js';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions } from '../options.js';
import { resolveCacheOptions, ResolvedCacheOptions } from './resolve-cache-options.js';

interface CacheLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

@Injectable()
export class DocsCacheService implements OnModuleInit {
  private readonly logger = new Logger(DocsCacheService.name);
  private cache: CacheLike | undefined;
  private resolved: ResolvedCacheOptions | undefined;
  private readonly trackedKeys = new Set<string>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly harvester: SchemaHarvesterService,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
  ) {}

  onModuleInit(): void {
    this.resolved = resolveCacheOptions(this.options.cache) ?? undefined;
    if (!this.resolved) return;
    try {
      this.cache = this.moduleRef.get(this.resolved.cacheToken, { strict: false }) as CacheLike;
    } catch {
      this.logger.warn(
        `Cache token "${String(this.resolved.cacheToken)}" not found in DI container. ` +
          'Falling back to in-memory caching. Register CacheModule to enable cache-manager integration.',
      );
      this.cache = undefined;
    }
  }

  isEnabled(): boolean {
    return this.cache !== undefined;
  }

  async get(key: string): Promise<string | undefined> {
    if (!this.cache) return undefined;
    try {
      return (await this.cache.get(key)) as string | undefined;
    } catch (error) {
      this.logger.warn(`cache.get("${key}") failed: ${(error as Error).message}`);
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.cache || !this.resolved) return;
    try {
      await this.cache.set(key, value, this.resolved.ttl * 1000);
      this.trackedKeys.add(key);
    } catch (error) {
      this.logger.warn(`cache.set("${key}") failed: ${(error as Error).message}`);
    }
  }

  async invalidate(): Promise<void> {
    if (!this.cache) return;
    for (const key of this.trackedKeys) {
      try {
        await this.cache.del(key);
      } catch (error) {
        this.logger.warn(`cache.del("${key}") failed: ${(error as Error).message}`);
      }
    }
    this.trackedKeys.clear();
  }
}
