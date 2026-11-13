export const resources={inquiries:'inquiries',clients:'profiles',projects:'projects',payments:'payments',legacyPayments:'legacy_payments',invoices:'invoices',quotes:'quotes',tickets:'tickets',notifications:'notification_outbox',backups:'backup_runs',activity:'audit_log'} as const;
export type Resource=keyof typeof resources;
