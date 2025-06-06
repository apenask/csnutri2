export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          cpf: string | null
          custom_category: string | null
          email: string
          id: string
          name: string
          phone: string
          points: number | null
          total_purchases: number | null
          total_spent: number | null
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          custom_category?: string | null
          email: string
          id: string
          name: string
          phone: string
          points?: number | null
          total_purchases?: number | null
          total_spent?: number | null
        }
        Update: {
          address?: string | null
          cpf?: string | null
          custom_category?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          points?: number | null
          total_purchases?: number | null
          total_spent?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          date: string
          description: string
          id: string
          supplier_id: string | null
        }
        Insert: {
          amount: number
          category: string
          date: string
          description: string
          id: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          date?: string
          description?: string
          id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost: number | null
          custom_category: string | null
          id: string
          image_url: string | null
          min_stock: number | null
          name: string
          price: number | null
          stock: number | null
          supplier_id: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost?: number | null
          custom_category?: string | null
          id: string
          image_url?: string | null
          min_stock?: number | null
          name: string
          price?: number | null
          stock?: number | null
          supplier_id?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost?: number | null
          custom_category?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number | null
          name?: string
          price?: number | null
          stock?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: number
          price: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
        }
        Insert: {
          id?: number
          price: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
        }
        Update: {
          id?: number
          price?: number
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          id: number
          method: string
          sale_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          id?: number
          method: string
          sale_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          id?: number
          method?: string
          sale_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          customer_id: string | null
          date: string
          id: string
          points_earned: number | null
          total: number
          user_id: string | null
        }
        Insert: {
          customer_id?: string | null
          date: string
          id: string
          points_earned?: number | null
          total: number
          user_id?: string | null
        }
        Update: {
          customer_id?: string | null
          date?: string
          id?: string
          points_earned?: number | null
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          email: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          email?: string | null
          id: string
          name: string
          phone: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}