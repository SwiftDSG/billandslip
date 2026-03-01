use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacilitasItem {
    pub name: String,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeductionItem {
    pub name: String,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub nik: String,
    pub nama: String,
    pub jabatan: String,
    pub gaji_pokok: u64,
    pub tunjangan: u64,
    pub status_ptkp: String,
    pub fasilitas: Vec<FacilitasItem>,
    pub is_bpjs_kes_member: bool,
    pub is_bpjs_tk_member: bool,
}
