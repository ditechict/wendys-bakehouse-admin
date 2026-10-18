import type { Database } from "@/integrations/supabase/types";

type GeneratedTables = Database["public"]["Tables"];

type AddFields<
  Table extends { Row: object; Insert: object; Update: object },
  RowFields extends object,
  WriteFields extends object,
> = Omit<Table, "Row" | "Insert" | "Update"> & {
  Row: Table["Row"] & RowFields;
  Insert: Table["Insert"] & WriteFields;
  Update: Table["Update"] & Partial<WriteFields>;
};

type DepositPercentRow = { deposit_percent: number | null };
type DepositPercentWrite = { deposit_percent?: number | null };
type CakeMinimums = {
  buttercream_minimum_cents: number | null;
  fondant_minimum_cents: number | null;
};
type MultipleRow = { allow_multiple: boolean };
type MultipleWrite = { allow_multiple?: boolean };

type TestimonialRow = {
  id: string;
  image_path: string;
  alt_text: string;
  customer_label: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TestimonialTable = {
  Row: TestimonialRow;
  Insert: Omit<TestimonialRow, "id" | "created_at" | "updated_at"> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<TestimonialRow, "id" | "created_at" | "updated_at">> & {
    updated_at?: string;
  };
  Relationships: [];
};

/** App-owned overlay for additive columns not yet present in Lovable's generated file. */
export type AppDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<
      GeneratedTables,
      "products" | "product_option_groups" | "orders" | "order_items" | "testimonials"
    > & {
      products: AddFields<
        GeneratedTables["products"],
        DepositPercentRow & CakeMinimums,
        DepositPercentWrite & Partial<CakeMinimums>
      >;
      product_option_groups: AddFields<
        GeneratedTables["product_option_groups"],
        MultipleRow,
        MultipleWrite
      >;
      orders: AddFields<GeneratedTables["orders"], DepositPercentRow, DepositPercentWrite>;
      order_items: AddFields<
        GeneratedTables["order_items"],
        DepositPercentRow,
        DepositPercentWrite
      >;
      testimonials: TestimonialTable;
    };
  };
};
