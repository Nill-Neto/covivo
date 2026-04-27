import type { Database } from "./types";

type PublicSchema = Database["public"];

type CreditCardsWithColor = Omit<PublicSchema["Tables"]["credit_cards"], "Row" | "Insert" | "Update"> & {
  Row: PublicSchema["Tables"]["credit_cards"]["Row"] & {
    color: string | null;
  };
  Insert: PublicSchema["Tables"]["credit_cards"]["Insert"] & {
    color?: string | null;
  };
  Update: PublicSchema["Tables"]["credit_cards"]["Update"] & {
    color?: string | null;
  };
};

export type ExtendedDatabase = Omit<Database, "public"> & {
  public: Omit<PublicSchema, "Tables"> & {
    Tables: Omit<PublicSchema["Tables"], "credit_cards"> & {
      credit_cards: CreditCardsWithColor;
    };
  };
};
