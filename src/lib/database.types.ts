export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_quality_assessments: {
        Row: {
          communication_score: number | null
          consultation_id: string
          created_at: string | null
          detailed_feedback: Json | null
          diagnostic_reasoning_score: number | null
          empathy_score: number | null
          id: string
          overall_score: number | null
          soap_analyzed: boolean | null
          soap_completeness_score: number | null
          thoroughness_score: number | null
          transcript_analyzed: boolean | null
          vet_id: string
        }
        Insert: {
          communication_score?: number | null
          consultation_id: string
          created_at?: string | null
          detailed_feedback?: Json | null
          diagnostic_reasoning_score?: number | null
          empathy_score?: number | null
          id?: string
          overall_score?: number | null
          soap_analyzed?: boolean | null
          soap_completeness_score?: number | null
          thoroughness_score?: number | null
          transcript_analyzed?: boolean | null
          vet_id: string
        }
        Update: {
          communication_score?: number | null
          consultation_id?: string
          created_at?: string | null
          detailed_feedback?: Json | null
          diagnostic_reasoning_score?: number | null
          empathy_score?: number | null
          id?: string
          overall_score?: number | null
          soap_analyzed?: boolean | null
          soap_completeness_score?: number | null
          thoroughness_score?: number | null
          transcript_analyzed?: boolean | null
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_quality_assessments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_quality_assessments_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_flags: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          consultation_id: string
          created_at: string | null
          details: string | null
          flagged_by: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          consultation_id: string
          created_at?: string | null
          details?: string | null
          flagged_by: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          consultation_id?: string
          created_at?: string | null
          details?: string | null
          flagged_by?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_flags_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_media: {
        Row: {
          consultation_id: string
          created_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          media_type: string
          thumbnail_url: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          media_type: string
          thumbnail_url?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          media_type?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_media_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_ratings: {
        Row: {
          consultation_id: string
          created_at: string | null
          customer_id: string
          feedback_text: string | null
          id: string
          rating: number
          vet_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          customer_id: string
          feedback_text?: string | null
          id?: string
          rating: number
          vet_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          customer_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_ratings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_ratings_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_treatment_records: {
        Row: {
          body_condition_score: string | null
          chief_complaint: string | null
          confidence_level: string | null
          consultation_id: string
          consultation_outcome: string | null
          created_at: string | null
          diagnosis_category: string | null
          differential_diagnoses: string[] | null
          dosage: string | null
          duration: string | null
          follow_up_required: boolean | null
          frequency: string | null
          id: string
          in_person_urgency: string | null
          in_person_visit_recommended: boolean | null
          instructions: string | null
          is_diagnosis_from_list: boolean | null
          is_medication_from_list: boolean | null
          medication_category: string | null
          medication_name: string
          pet_age_months: number | null
          pet_breed: string | null
          pet_existing_conditions: string[] | null
          pet_gender: string | null
          pet_id: string
          pet_is_neutered: boolean | null
          pet_known_allergies: string[] | null
          pet_species: string
          pet_weight_kg: number | null
          provisional_diagnosis: string
          route: string | null
          symptom_categories: string[] | null
          vet_id: string
          vital_signs: Json | null
        }
        Insert: {
          body_condition_score?: string | null
          chief_complaint?: string | null
          confidence_level?: string | null
          consultation_id: string
          consultation_outcome?: string | null
          created_at?: string | null
          diagnosis_category?: string | null
          differential_diagnoses?: string[] | null
          dosage?: string | null
          duration?: string | null
          follow_up_required?: boolean | null
          frequency?: string | null
          id?: string
          in_person_urgency?: string | null
          in_person_visit_recommended?: boolean | null
          instructions?: string | null
          is_diagnosis_from_list?: boolean | null
          is_medication_from_list?: boolean | null
          medication_category?: string | null
          medication_name: string
          pet_age_months?: number | null
          pet_breed?: string | null
          pet_existing_conditions?: string[] | null
          pet_gender?: string | null
          pet_id: string
          pet_is_neutered?: boolean | null
          pet_known_allergies?: string[] | null
          pet_species: string
          pet_weight_kg?: number | null
          provisional_diagnosis: string
          route?: string | null
          symptom_categories?: string[] | null
          vet_id: string
          vital_signs?: Json | null
        }
        Update: {
          body_condition_score?: string | null
          chief_complaint?: string | null
          confidence_level?: string | null
          consultation_id?: string
          consultation_outcome?: string | null
          created_at?: string | null
          diagnosis_category?: string | null
          differential_diagnoses?: string[] | null
          dosage?: string | null
          duration?: string | null
          follow_up_required?: boolean | null
          frequency?: string | null
          id?: string
          in_person_urgency?: string | null
          in_person_visit_recommended?: boolean | null
          instructions?: string | null
          is_diagnosis_from_list?: boolean | null
          is_medication_from_list?: boolean | null
          medication_category?: string | null
          medication_name?: string
          pet_age_months?: number | null
          pet_breed?: string | null
          pet_existing_conditions?: string[] | null
          pet_gender?: string | null
          pet_id?: string
          pet_is_neutered?: boolean | null
          pet_known_allergies?: string[] | null
          pet_species?: string
          pet_weight_kg?: number | null
          provisional_diagnosis?: string
          route?: string | null
          symptom_categories?: string[] | null
          vet_id?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_treatment_records_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_treatment_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_treatment_records_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          accepted_at: string | null
          amount_paid: number | null
          concern_text: string | null
          consultation_number: string
          created_at: string | null
          customer_id: string
          daily_room_name: string | null
          daily_room_url: string | null
          duration_minutes: number | null
          ended_at: string | null
          follow_up_expires_at: string | null
          id: string
          is_follow_up: boolean | null
          is_free: boolean | null
          is_priority: boolean | null
          outcome: string | null
          parent_consultation_id: string | null
          payment_id: string | null
          pet_id: string
          recording_id: string | null
          recording_url: string | null
          reminder_15m_sent: boolean | null
          reminder_1h_sent: boolean | null
          room_created_at: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          symptom_categories: string[] | null
          type: string
          updated_at: string | null
          vet_id: string | null
          was_extended: boolean | null
        }
        Insert: {
          accepted_at?: string | null
          amount_paid?: number | null
          concern_text?: string | null
          consultation_number?: string
          created_at?: string | null
          customer_id: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          follow_up_expires_at?: string | null
          id?: string
          is_follow_up?: boolean | null
          is_free?: boolean | null
          is_priority?: boolean | null
          outcome?: string | null
          parent_consultation_id?: string | null
          payment_id?: string | null
          pet_id: string
          recording_id?: string | null
          recording_url?: string | null
          reminder_15m_sent?: boolean | null
          reminder_1h_sent?: boolean | null
          room_created_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          symptom_categories?: string[] | null
          type: string
          updated_at?: string | null
          vet_id?: string | null
          was_extended?: boolean | null
        }
        Update: {
          accepted_at?: string | null
          amount_paid?: number | null
          concern_text?: string | null
          consultation_number?: string
          created_at?: string | null
          customer_id?: string
          daily_room_name?: string | null
          daily_room_url?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          follow_up_expires_at?: string | null
          id?: string
          is_follow_up?: boolean | null
          is_free?: boolean | null
          is_priority?: boolean | null
          outcome?: string | null
          parent_consultation_id?: string | null
          payment_id?: string | null
          pet_id?: string
          recording_id?: string | null
          recording_url?: string | null
          reminder_15m_sent?: boolean | null
          reminder_1h_sent?: boolean | null
          room_created_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          symptom_categories?: string[] | null
          type?: string
          updated_at?: string | null
          vet_id?: string | null
          was_extended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_parent_consultation_id_fkey"
            columns: ["parent_consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          sender_id: string
          sender_role: string | null
          thread_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id: string
          sender_role?: string | null
          thread_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string
          sender_role?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "follow_up_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_threads: {
        Row: {
          consultation_id: string
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          pet_id: string
          vet_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          pet_id: string
          vet_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          pet_id?: string
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_threads_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_threads_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_threads_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description: string
          id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_submissions: {
        Row: {
          additional_data: Json | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          species: string | null
          status: string
          submitted_by: string
          type: string
        }
        Insert: {
          additional_data?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          species?: string | null
          status?: string
          submitted_by: string
          type: string
        }
        Update: {
          additional_data?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          species?: string | null
          status?: string
          submitted_by?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cashfree_order_id: string
          cashfree_payment_id: string | null
          consultation_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          id: string
          metadata: Json | null
          payment_method: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_by: string | null
          status: string
          subscription_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          cashfree_order_id: string
          cashfree_payment_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_by?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cashfree_order_id?: string
          cashfree_payment_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_by?: string | null
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          approximate_age_months: number | null
          breed: string
          color_markings: string | null
          created_at: string | null
          current_medications: Json | null
          date_of_birth: string | null
          diet_details: string | null
          diet_type: string | null
          existing_conditions: string[] | null
          gender: string
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_neutered: boolean | null
          known_allergies: string[] | null
          medical_docs_urls: string[] | null
          microchip_number: string | null
          name: string
          owner_id: string
          photo_urls: string[] | null
          primary_vet_contact: string | null
          species: string
          updated_at: string | null
          vaccination_history: Json | null
          weight_kg: number | null
        }
        Insert: {
          approximate_age_months?: number | null
          breed: string
          color_markings?: string | null
          created_at?: string | null
          current_medications?: Json | null
          date_of_birth?: string | null
          diet_details?: string | null
          diet_type?: string | null
          existing_conditions?: string[] | null
          gender: string
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_neutered?: boolean | null
          known_allergies?: string[] | null
          medical_docs_urls?: string[] | null
          microchip_number?: string | null
          name: string
          owner_id: string
          photo_urls?: string[] | null
          primary_vet_contact?: string | null
          species: string
          updated_at?: string | null
          vaccination_history?: Json | null
          weight_kg?: number | null
        }
        Update: {
          approximate_age_months?: number | null
          breed?: string
          color_markings?: string | null
          created_at?: string | null
          current_medications?: Json | null
          date_of_birth?: string | null
          diet_details?: string | null
          diet_type?: string | null
          existing_conditions?: string[] | null
          gender?: string
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_neutered?: boolean | null
          known_allergies?: string[] | null
          medical_docs_urls?: string[] | null
          microchip_number?: string | null
          name?: string
          owner_id?: string
          photo_urls?: string[] | null
          primary_vet_contact?: string | null
          species?: string
          updated_at?: string | null
          vaccination_history?: Json | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          consultation_id: string
          created_at: string | null
          customer_id: string
          dietary_recommendations: string | null
          follow_up_recommendation: string | null
          id: string
          in_person_advisory: string | null
          lifestyle_recommendations: string | null
          medications: Json
          pdf_url: string | null
          pet_id: string
          prescription_number: string
          soap_note_id: string
          status: string | null
          updated_at: string | null
          vet_id: string
          warning_signs: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          customer_id: string
          dietary_recommendations?: string | null
          follow_up_recommendation?: string | null
          id?: string
          in_person_advisory?: string | null
          lifestyle_recommendations?: string | null
          medications?: Json
          pdf_url?: string | null
          pet_id: string
          prescription_number?: string
          soap_note_id: string
          status?: string | null
          updated_at?: string | null
          vet_id: string
          warning_signs?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          customer_id?: string
          dietary_recommendations?: string | null
          follow_up_recommendation?: string | null
          id?: string
          in_person_advisory?: string | null
          lifestyle_recommendations?: string | null
          medications?: Json
          pdf_url?: string | null
          pet_id?: string
          prescription_number?: string
          soap_note_id?: string
          status?: string | null
          updated_at?: string | null
          vet_id?: string
          warning_signs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_soap_note_id_fkey"
            columns: ["soap_note_id"]
            isOneToOne: false
            referencedRelation: "soap_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          age_multipliers: Json
          base_rate: number
          breed_risk_multipliers: Json
          ceiling_price: number
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_until: string | null
          floor_price: number
          id: string
          is_active: boolean | null
          name: string
          species_multipliers: Json
          updated_at: string | null
        }
        Insert: {
          age_multipliers?: Json
          base_rate: number
          breed_risk_multipliers?: Json
          ceiling_price: number
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          floor_price: number
          id?: string
          is_active?: boolean | null
          name: string
          species_multipliers?: Json
          updated_at?: string | null
        }
        Update: {
          age_multipliers?: Json
          base_rate?: number
          breed_risk_multipliers?: Json
          ceiling_price?: number
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          floor_price?: number
          id?: string
          is_active?: boolean | null
          name?: string
          species_multipliers?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sachet_codes: {
        Row: {
          batch_id: string | null
          code: string
          created_at: string | null
          id: string
          is_redeemed: boolean | null
          partner_name: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          sachet_id: string
        }
        Insert: {
          batch_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          partner_name?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          sachet_id: string
        }
        Update: {
          batch_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          partner_name?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          sachet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sachet_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sachet_codes_sachet_id_fkey"
            columns: ["sachet_id"]
            isOneToOne: false
            referencedRelation: "sachets"
            referencedColumns: ["id"]
          },
        ]
      }
      sachets: {
        Row: {
          code: string
          consultation_validity_days: number | null
          created_at: string | null
          id: string
          inclusions: Json
          is_active: boolean | null
          is_algorithmic_pricing: boolean | null
          list_price: number | null
          max_discount_percent: number | null
          min_bulk_purchase: number | null
          name: string
          type: string
          updated_at: string | null
          validity_days: number
        }
        Insert: {
          code: string
          consultation_validity_days?: number | null
          created_at?: string | null
          id?: string
          inclusions: Json
          is_active?: boolean | null
          is_algorithmic_pricing?: boolean | null
          list_price?: number | null
          max_discount_percent?: number | null
          min_bulk_purchase?: number | null
          name: string
          type: string
          updated_at?: string | null
          validity_days: number
        }
        Update: {
          code?: string
          consultation_validity_days?: number | null
          created_at?: string | null
          id?: string
          inclusions?: Json
          is_active?: boolean | null
          is_algorithmic_pricing?: boolean | null
          list_price?: number | null
          max_discount_percent?: number | null
          min_bulk_purchase?: number | null
          name?: string
          type?: string
          updated_at?: string | null
          validity_days?: number
        }
        Relationships: []
      }
      soap_notes: {
        Row: {
          activity_level_changes: string | null
          additional_diagnostics: string | null
          appetite_changes: string | null
          behavior_changes: string | null
          body_condition_score: string | null
          chief_complaint: string | null
          confidence_level: string | null
          consultation_id: string
          created_at: string | null
          diet_info: string | null
          dietary_recommendations: string | null
          differential_diagnoses: string[] | null
          environmental_factors: string | null
          follow_up_timeframe: string | null
          gait_mobility: string | null
          general_appearance: string | null
          history_present_illness: string | null
          home_care_instructions: string | null
          id: string
          in_person_urgency: string | null
          in_person_visit_recommended: boolean | null
          lifestyle_modifications: string | null
          medications: Json | null
          other_pets_household: string | null
          previous_treatments: string | null
          provisional_diagnosis: string | null
          referenced_media_urls: string[] | null
          referral_specialist: string | null
          respiratory_pattern: string | null
          teleconsultation_limitations: string | null
          updated_at: string | null
          vet_id: string
          visible_physical_findings: string | null
          vital_signs: Json | null
          warning_signs: string | null
        }
        Insert: {
          activity_level_changes?: string | null
          additional_diagnostics?: string | null
          appetite_changes?: string | null
          behavior_changes?: string | null
          body_condition_score?: string | null
          chief_complaint?: string | null
          confidence_level?: string | null
          consultation_id: string
          created_at?: string | null
          diet_info?: string | null
          dietary_recommendations?: string | null
          differential_diagnoses?: string[] | null
          environmental_factors?: string | null
          follow_up_timeframe?: string | null
          gait_mobility?: string | null
          general_appearance?: string | null
          history_present_illness?: string | null
          home_care_instructions?: string | null
          id?: string
          in_person_urgency?: string | null
          in_person_visit_recommended?: boolean | null
          lifestyle_modifications?: string | null
          medications?: Json | null
          other_pets_household?: string | null
          previous_treatments?: string | null
          provisional_diagnosis?: string | null
          referenced_media_urls?: string[] | null
          referral_specialist?: string | null
          respiratory_pattern?: string | null
          teleconsultation_limitations?: string | null
          updated_at?: string | null
          vet_id: string
          visible_physical_findings?: string | null
          vital_signs?: Json | null
          warning_signs?: string | null
        }
        Update: {
          activity_level_changes?: string | null
          additional_diagnostics?: string | null
          appetite_changes?: string | null
          behavior_changes?: string | null
          body_condition_score?: string | null
          chief_complaint?: string | null
          confidence_level?: string | null
          consultation_id?: string
          created_at?: string | null
          diet_info?: string | null
          dietary_recommendations?: string | null
          differential_diagnoses?: string[] | null
          environmental_factors?: string | null
          follow_up_timeframe?: string | null
          gait_mobility?: string | null
          general_appearance?: string | null
          history_present_illness?: string | null
          home_care_instructions?: string | null
          id?: string
          in_person_urgency?: string | null
          in_person_visit_recommended?: boolean | null
          lifestyle_modifications?: string | null
          medications?: Json | null
          other_pets_household?: string | null
          previous_treatments?: string | null
          provisional_diagnosis?: string | null
          referenced_media_urls?: string[] | null
          referral_specialist?: string | null
          respiratory_pattern?: string | null
          teleconsultation_limitations?: string | null
          updated_at?: string | null
          vet_id?: string
          visible_physical_findings?: string | null
          vital_signs?: Json | null
          warning_signs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soap_notes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          pet_id: string
          plan_type: string
          price_computed: number | null
          pricing_factors: Json | null
          sachet_id: string | null
          starts_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          pet_id: string
          plan_type: string
          price_computed?: number | null
          pricing_factors?: Json | null
          sachet_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          pet_id?: string
          plan_type?: string
          price_computed?: number | null
          pricing_factors?: Json | null
          sachet_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_sachet_id_fkey"
            columns: ["sachet_id"]
            isOneToOne: false
            referencedRelation: "sachets"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_schedules: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string
          id: string
          is_approved: boolean | null
          is_completed: boolean | null
          notes: string | null
          pet_id: string
          reminder_sent: boolean | null
          vaccine_name: string
          vet_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          is_approved?: boolean | null
          is_completed?: boolean | null
          notes?: string | null
          pet_id: string
          reminder_sent?: boolean | null
          vaccine_name: string
          vet_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          is_approved?: boolean | null
          is_completed?: boolean | null
          notes?: string | null
          pet_id?: string
          reminder_sent?: boolean | null
          vaccine_name?: string
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_schedules_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_schedules_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_prescribing_patterns: {
        Row: {
          created_at: string | null
          diagnosis: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          last_used_at: string | null
          medication_name: string
          pet_species: string
          route: string | null
          use_count: number | null
          vet_id: string
        }
        Insert: {
          created_at?: string | null
          diagnosis: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          last_used_at?: string | null
          medication_name: string
          pet_species: string
          route?: string | null
          use_count?: number | null
          vet_id: string
        }
        Update: {
          created_at?: string | null
          diagnosis?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          last_used_at?: string | null
          medication_name?: string
          pet_species?: string
          route?: string | null
          use_count?: number | null
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_prescribing_patterns_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_profiles: {
        Row: {
          ai_quality_score: number | null
          availability_schedule: Json | null
          average_rating: number | null
          consultation_count: number | null
          created_at: string | null
          degree_certificate_url: string | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          qualifications: string
          specializations: string[] | null
          state_council_registration: string | null
          updated_at: string | null
          vci_registration_number: string
          years_of_experience: number | null
        }
        Insert: {
          ai_quality_score?: number | null
          availability_schedule?: Json | null
          average_rating?: number | null
          consultation_count?: number | null
          created_at?: string | null
          degree_certificate_url?: string | null
          id: string
          is_available?: boolean | null
          is_verified?: boolean | null
          qualifications: string
          specializations?: string[] | null
          state_council_registration?: string | null
          updated_at?: string | null
          vci_registration_number: string
          years_of_experience?: number | null
        }
        Update: {
          ai_quality_score?: number | null
          availability_schedule?: Json | null
          average_rating?: number | null
          consultation_count?: number | null
          created_at?: string | null
          degree_certificate_url?: string | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          qualifications?: string
          specializations?: string[] | null
          state_council_registration?: string | null
          updated_at?: string | null
          vci_registration_number?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_consultation_number: { Args: never; Returns: string }
      generate_prescription_number: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_vet: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
