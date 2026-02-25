import { UserRole, MaterialCategory, LocationType, TransactionType } from "@prisma/client";

export type { UserRole, MaterialCategory, LocationType, TransactionType };

export interface DashboardStats {
  totalMaterials: number;
  lowStockItems: number;
  activeJobs: number;
  totalLocations: number;
}

export interface InventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  locationId: string;
  locationName: string;
  quantity: number;
  minStockLevel: number;
  isLowStock: boolean;
}

export interface TransactionWithDetails {
  id: string;
  type: TransactionType;
  materialName: string;
  category: MaterialCategory;
  quantity: number;
  fromLocationName?: string;
  toLocationName?: string;
  userName: string;
  date: string;
  vendor?: string;
  poNumber?: string;
  invoiceNumber?: string;
  notes?: string;
  invoicePhotos: Array<{
    id: string;
    cloud_storage_path: string;
    isPublic: boolean;
  }>;
}

export interface MaterialUsageByJob {
  jobName: string;
  materials: Array<{
    materialName: string;
    category: MaterialCategory;
    totalQuantity: number;
  }>;
}

export interface PurchaseHistory {
  vendor: string;
  purchases: Array<{
    date: string;
    materialName: string;
    quantity: number;
    poNumber?: string;
    invoiceNumber?: string;
  }>;
}
