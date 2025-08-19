// Shared type definitions for investment module

// Base DataSource record type
export type DataSourceRecord = {
  recordId: string;
  entityId: string;
  entityName: string;
  dataSourceType: 'info' | 'strategy';
  content: string;
  metadata: Record<string, string | number | boolean | null> | null;
  createdAt: string;
};

// Extended record with classification
export type ClassifiedDataSourceRecord = DataSourceRecord & {
  category: 'investment' | 'entertainment' | 'spam' | 'other';
  classificationReason: string;
  classifiedAt?: string;
};

// Extended record with deduplication
export type DeduplicatedDataSourceRecord = ClassifiedDataSourceRecord & {
  processedContent?: string;
  deduplicationMetadata?: {
    action: 'new' | 'update' | 'processed';
    relationship?: 'identical' | 'new_contains_existing' | 'existing_contains_new' | 'unrelated' | 'partial_overlap';
    similarityScore?: number;
    matchedRecordId?: string;
    isTimeEffective?: boolean;
  };
  deduplicatedAt?: string;
};

// Content category type
export type ContentCategory = 'investment' | 'entertainment' | 'spam' | 'other';
