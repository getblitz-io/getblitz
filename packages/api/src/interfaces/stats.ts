/**
 * Stats and dashboard types
 */

import type { PaymentStatus } from "@getblitz/database";

export interface PaymentStatusStats {
  status: PaymentStatus;
  _count: number;
}

export interface OrganizationCounts {
  organizationId: string;
  secretKeyCount: number;
  bankAccountCount: number;
  paymentCount: number;
}

export interface DashboardStats {
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
}
