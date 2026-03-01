use serde::{Deserialize, Serialize};

use super::employee::{DeductionItem, FacilitasItem};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payslip {
    pub period: String,
    pub period_label: String,
    pub nik: String,
    pub nama: String,
    pub jabatan: String,
    pub status_ptkp: String,
    pub hari_kerja_config: u32,
    pub hari_kerja_aktual: u32,

    // Income components
    pub gaji_pokok: u64,
    pub gaji_prorata: f64,
    pub overtime: f64,
    pub overtime_hours: f64,
    pub overtime_rate_per_hour: u64,
    pub uang_transport: u64,
    pub uang_makan: u64,
    pub bonus: u64,
    pub fasilitas: u64,
    pub fasilitas_items: Vec<FacilitasItem>,

    // Employee deductions
    pub bpjs_kes_employee: f64,
    pub bpjs_jht_employee: f64,
    pub pph21: f64,
    pub potongan_internal: u64,
    pub potongan_internal_items: Vec<DeductionItem>,

    // Employer contributions (informational)
    pub bpjs_kes_employer: f64,
    pub bpjs_jht_employer: f64,
    pub bpjs_jkk_employer: f64,
    pub bpjs_jkm_employer: f64,

    // Totals
    pub total_pendapatan: f64,
    pub total_potongan: f64,
    pub take_home_pay: f64,
}
