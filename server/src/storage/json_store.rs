use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

use serde::{Deserialize, Serialize};

use crate::models::{DeductionItem, Employee, PayrollConfig, PayrollEntry, TransportMode};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DataStore {
    pub employees: Vec<Employee>,
    pub payroll_configs: HashMap<String, PayrollConfig>,
    pub payroll_entries: HashMap<String, Vec<PayrollEntry>>,
}

pub struct JsonStore {
    path: PathBuf,
    pub data: Arc<RwLock<DataStore>>,
}

impl JsonStore {
    pub async fn load_or_create(path: impl AsRef<Path>) -> Self {
        let path = path.as_ref().to_path_buf();
        let data = if path.exists() {
            let contents = tokio::fs::read_to_string(&path)
                .await
                .expect("Failed to read store.json");
            let store: DataStore = serde_json::from_str(&contents)
                .expect("Failed to parse store.json");
            if store.employees.is_empty() {
                seed_data()
            } else {
                store
            }
        } else {
            seed_data()
        };

        let store = Self {
            path,
            data: Arc::new(RwLock::new(data)),
        };
        // Persist seed immediately
        store.persist().await;
        store
    }

    pub async fn persist(&self) {
        let data = self.data.read().await;
        let json = serde_json::to_string_pretty(&*data).expect("Failed to serialize store");
        drop(data);

        let tmp = self.path.with_extension("json.tmp");
        tokio::fs::write(&tmp, json).await.expect("Failed to write tmp store");
        tokio::fs::rename(&tmp, &self.path).await.expect("Failed to rename store");
    }
}

fn seed_data() -> DataStore {
    let employees = vec![
        Employee {
            nik: "3271062612000018".into(),
            nama: "Dylan Eldiyano Ramadhan".into(),
            jabatan: "Analyst".into(),
            gaji_pokok: 18_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3402122812860002".into(),
            nama: "Berlianagara A. H".into(),
            jabatan: "Analyst".into(),
            gaji_pokok: 6_000_000,
            tunjangan: 220_000,
            status_ptkp: "K/3".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "0000000000000000".into(),
            nama: "Zwin".into(),
            jabatan: "Analyst".into(),
            gaji_pokok: 5_730_000,
            tunjangan: 220_000,
            status_ptkp: "".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3578105610980006".into(),
            nama: "Nabilla Firdaus Palesta Lihawa".into(),
            jabatan: "Finance".into(),
            gaji_pokok: 7_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3509066607020002".into(),
            nama: "Fiagem Dwi Woro Bahwani".into(),
            jabatan: "Personal Assistant".into(),
            gaji_pokok: 5_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3516132404020001".into(),
            nama: "Alfian Dwi Nugraha".into(),
            jabatan: "IT/Programmer".into(),
            gaji_pokok: 7_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3506251905960002".into(),
            nama: "Masrukin".into(),
            jabatan: "Media".into(),
            gaji_pokok: 7_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3509031207020013".into(),
            nama: "Bowo Prayoga".into(),
            jabatan: "Media".into(),
            gaji_pokok: 5_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "1802180809010001".into(),
            nama: "Satria Baladewa Harahap".into(),
            jabatan: "Media".into(),
            gaji_pokok: 5_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3515182611990006".into(),
            nama: "Rudi Ardi Hamzah".into(),
            jabatan: "Media".into(),
            gaji_pokok: 4_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3505101808040002".into(),
            nama: "Muhammad Fariza Agustino".into(),
            jabatan: "Media".into(),
            gaji_pokok: 5_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "0000000000000001".into(),
            nama: "Pendik".into(),
            jabatan: "Media".into(),
            gaji_pokok: 2_500_000,
            tunjangan: 220_000,
            status_ptkp: "".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3523037103030001".into(),
            nama: "Meysa Mahfudhoh".into(),
            jabatan: "Media".into(),
            gaji_pokok: 3_500_000,
            tunjangan: 220_000,
            status_ptkp: "".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3515153107010001".into(),
            nama: "M. Rizqi R.".into(),
            jabatan: "Media".into(),
            gaji_pokok: 2_500_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "6201026602010003".into(),
            nama: "Florencia Irena".into(),
            jabatan: "Marketing - Visual Design".into(),
            gaji_pokok: 5_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3509050202010002".into(),
            nama: "Fahrul Muttaqin".into(),
            jabatan: "Marketing - Visual Design".into(),
            gaji_pokok: 4_500_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3578030810010002".into(),
            nama: "Abid Ariq Athallah".into(),
            jabatan: "Marketing - Visual Design".into(),
            gaji_pokok: 4_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3578012501030002".into(),
            nama: "Bambang Adi".into(),
            jabatan: "Marketing - Visual Design".into(),
            gaji_pokok: 3_230_000,
            tunjangan: 220_000,
            status_ptkp: "".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: false,
            is_bpjs_tk_member: false,
        },
        Employee {
            nik: "3522082502850005".into(),
            nama: "Mochamad Soleh".into(),
            jabatan: "Operasional".into(),
            gaji_pokok: 4_500_000,
            tunjangan: 220_000,
            status_ptkp: "K/2".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3524013107840001".into(),
            nama: "Kamit".into(),
            jabatan: "Operasional".into(),
            gaji_pokok: 3_500_000,
            tunjangan: 220_000,
            status_ptkp: "K/1".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: true,
        },
        Employee {
            nik: "3522081109070003".into(),
            nama: "Galang Belvasya Septian".into(),
            jabatan: "Operasional".into(),
            gaji_pokok: 3_000_000,
            tunjangan: 220_000,
            status_ptkp: "TK/0".into(),
            fasilitas: vec![],
            is_bpjs_kes_member: true,
            is_bpjs_tk_member: false,
        },
    ];

    let feb_config = PayrollConfig {
        period: "2026-02".into(),
        period_label: "Februari 2026".into(),
        hari_kerja: 19,
        uang_transport_mode: TransportMode::Flat,
        uang_transport_flat: 220_000,
        uang_transport_per_hari: 0,
        uang_makan_per_hari: 25_000,
        bpjs_kes_employee_rate: 0.01,
        bpjs_kes_employer_rate: 0.04,
        bpjs_kes_salary_cap: 5_288_796,
        bpjs_jht_employee_rate: 0.02,
        bpjs_jht_employer_rate: 0.037,
        bpjs_jkk_employer_rate: 0.0024,
        bpjs_jkm_employer_rate: 0.003,
        bpjs_tk_salary_cap: 5_000_000,
    };

    let feb_entries: Vec<PayrollEntry> = employees
        .iter()
        .map(|e| {
            let mut entry = PayrollEntry::default_for(&e.nik, feb_config.hari_kerja);
            match e.nik.as_str() {
                // Dylan: no makan
                "3271062612000018" => {
                    entry.makan_override = Some(0);
                }
                // Zwin: worked 14/19
                "0000000000000000" => entry.hari_kerja_aktual = 14,
                // Meysa: worked 17/19
                "3523037103030001" => entry.hari_kerja_aktual = 17,
                // Florencia: worked 7/19
                "6201026602010003" => entry.hari_kerja_aktual = 7,
                // Bambang: worked 10/19
                "3578012501030002" => entry.hari_kerja_aktual = 10,
                // Alfian: 5M bonus this period
                "3516132404020001" => entry.bonus = 5_000_000,
                // Pendik: no transport, no makan
                "0000000000000001" => {
                    entry.transport_override = Some(0);
                    entry.makan_override = Some(0);
                }
                // M. Rizqi: no transport, no makan
                "3515153107010001" => {
                    entry.transport_override = Some(0);
                    entry.makan_override = Some(0);
                }
                // Kamit: loan installment (4th of 6)
                "3524013107840001" => {
                    entry.potongan_internal = vec![DeductionItem {
                        name: "Cicilan Pinjaman".into(),
                        amount: 400_000,
                    }];
                }
                _ => {}
            }
            entry
        })
        .collect();

    let mut payroll_configs = HashMap::new();
    payroll_configs.insert("2026-02".into(), feb_config);

    let mut payroll_entries = HashMap::new();
    payroll_entries.insert("2026-02".into(), feb_entries);

    DataStore {
        employees,
        payroll_configs,
        payroll_entries,
    }
}
