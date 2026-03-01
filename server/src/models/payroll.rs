use serde::{Deserialize, Serialize};

use super::employee::{DeductionItem, FacilitasItem};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransportMode {
    Flat,
    PerDay,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollConfig {
    pub period: String,
    pub period_label: String,
    pub hari_kerja: u32,

    pub uang_transport_mode: TransportMode,
    pub uang_transport_flat: u64,
    pub uang_transport_per_hari: u64,
    pub uang_makan_per_hari: u64,

    pub bpjs_kes_employee_rate: f64,
    pub bpjs_kes_employer_rate: f64,
    pub bpjs_kes_salary_cap: u64,

    pub bpjs_jht_employee_rate: f64,
    pub bpjs_jht_employer_rate: f64,
    pub bpjs_jkk_employer_rate: f64,
    pub bpjs_jkm_employer_rate: f64,
    pub bpjs_tk_salary_cap: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollEntry {
    pub nik: String,
    pub hari_kerja_aktual: u32,
    pub overtime_hours: f64,
    pub overtime_rate_per_hour: u64,
    pub bonus: u64,
    pub potongan_internal: Vec<DeductionItem>,
    pub fasilitas_override: Option<Vec<FacilitasItem>>,
    pub transport_override: Option<u64>,
    pub makan_override: Option<u64>,
}

impl PayrollEntry {
    pub fn default_for(nik: &str, hari_kerja: u32) -> Self {
        Self {
            nik: nik.to_string(),
            hari_kerja_aktual: hari_kerja,
            overtime_hours: 0.0,
            overtime_rate_per_hour: 0,
            bonus: 0,
            potongan_internal: vec![],
            fasilitas_override: None,
            transport_override: None,
            makan_override: None,
        }
    }
}
