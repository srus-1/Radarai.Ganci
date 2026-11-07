export type CapexCategory =
  | 'Mesin & Peralatan'
  | 'Perlengkapan Workshop'
  | 'Elektronik & IT'
  | 'Renovasi Workshop'
  | 'Lainnya';

export type RawMaterialCategory =
  | 'Akrilik & Aksesoris'
  | 'Tinta & Sablon'
  | 'Kemasan & Packaging'
  | 'Sparepart & Consumable'
  | 'Lainnya';

export interface CapexEntry {
  id: string;
  itemName: string;
  category: CapexCategory | string;
  amount: number;
  entryDate: string; // YYYY-MM-DD
  description?: string;
  notes?: string;
  usefulLifeMonths?: number;
  monthlyDepreciation?: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateCapexInput = Omit<CapexEntry, 'id' | 'createdAt' | 'updatedAt'>;

export interface RawMaterialEntry {
  id: string;
  materialName: string;
  category: RawMaterialCategory | string;
  supplier: string;
  quantity: number;
  qty?: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  entryDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateRawMaterialInput = Omit<
  RawMaterialEntry,
  'id' | 'createdAt' | 'updatedAt' | 'totalAmount'
> & {
  totalAmount?: number;
};
