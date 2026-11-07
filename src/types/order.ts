export type PaymentStatus = 'LUNAS' | 'DP' | 'BELUM_LUNAS';

export type ProcessStatus =
  | 'ANTREAN'
  | 'SETTING_DESAIN'
  | 'PROSES_CETAK'
  | 'FINISHING'
  | 'SIAP_KIRIM'
  | 'SELESAI';

export type FilterTab = 'ALL' | 'BELUM_LUNAS_DP' | 'PROSES' | 'SELESAI';

export interface DesignFile {
  id: string;
  orderId: string;
  fileName: string;
  fileSize: number;
  fileType: 'CDR' | 'AI' | 'PSD' | 'PDF' | 'PNG' | 'JPG' | string;
  fileUrl: string;
  thumbnailUrl?: string;
  isReadyToPrint: boolean;
  uploadedAt: string;
}

export interface HPPBreakdown {
  bahanBaku: number;
  tintaSablon: number;
  tenagaKerja: number;
  kemasan: number;
  overhead: number;
  totalHppPerPcs: number;
  totalHpp: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  deadline: string;
  buyerName: string;
  buyerPhone: string;
  productName: string;
  specs: string;
  qty: number;
  pricePerPcs: number;
  omzet: number;
  hppBreakdown: HPPBreakdown;
  profit: number;
  marginPct: number;
  paymentStatus: PaymentStatus;
  dpAmount: number;
  remainingPayment: number;
  processStatus: ProcessStatus;
  queueOrder: number;
  designFiles: DesignFile[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateOrderInput = Omit<
  Order,
  | 'id'
  | 'orderNumber'
  | 'createdAt'
  | 'updatedAt'
  | 'queueOrder'
  | 'omzet'
  | 'profit'
  | 'marginPct'
  | 'remainingPayment'
  | 'hppBreakdown'
  | 'designFiles'
> & {
  hppBreakdown: Omit<HPPBreakdown, 'totalHppPerPcs' | 'totalHpp'> | HPPBreakdown;
  designFiles?: DesignFile[];
};

export interface BuyerSummary {
  buyerName: string;
  buyerPhone: string;
  totalOrders: number;
  totalPcs: number;
  totalOmzet: number;
  totalHpp: number;
  totalProfit: number;
  marginPct: number;
  rank?: number;
}

export interface DashboardMetrics {
  totalPcs: number;
  totalOmzet: number;
  totalProfit: number;
  totalHpp: number;
  totalPiutangDp: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  averageMarginPct: number;
}

export interface MonthlyProfitData {
  month: string;
  monthLabel: string;
  omzet: number;
  hpp: number;
  profit: number;
  marginPct: number;
  pcs: number;
}
