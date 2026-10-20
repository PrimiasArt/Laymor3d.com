/**
 * Module: Admin Dashboard, System Configuration & Telemetry
 * Layer 1 (UI): AdminPage, AdminAuditLogManager, AdminCrawlerManager, AdminKnowledgeManager, AdminModulesManager, AdminProductsManager, AdminTrendsManager, AdminUserManager, ModuleRouteGuard, StagingSandboxDock
 * Layer 2 (Hooks): useModulePermissions, useSystemEnvironment
 * Layer 3 (Backend): ConfigRepository, AuditLogRepository, KnowledgeRepository, MockDatabase, ModelRepository
 */

export * from './ui/AdminPage';
export * from './ui/AdminAuditLogManager';
export * from './ui/AdminCrawlerManager';
export * from './ui/AdminKnowledgeManager';
export * from './ui/AdminModulesManager';
export * from './ui/AdminProductsManager';
export * from './ui/AdminTrendsManager';
export * from './ui/AdminUserManager';
export * from './ui/ModuleRouteGuard';
export * from './ui/StagingSandboxDock';

export * from './hooks/useModulePermissions';
export * from './hooks/useSystemEnvironment';
