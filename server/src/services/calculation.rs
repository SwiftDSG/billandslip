use crate::models::{
    DeductionItem, Employee, FacilitasItem, PayrollConfig, PayrollEntry, Payslip, TransportMode,
};

pub fn compute_payslip(
    employee: &Employee,
    entry: &PayrollEntry,
    config: &PayrollConfig,
) -> Payslip {
    // 1. Gaji Prorata (uses hari_kerja_config as divisor per Indonesian HR convention)
    let gaji_prorata = if entry.hari_kerja_aktual >= config.hari_kerja {
        employee.gaji_pokok as f64
    } else {
        (employee.gaji_pokok as f64 / config.hari_kerja as f64)
            * entry.hari_kerja_aktual as f64
    };

    // 2. Overtime
    let overtime = entry.overtime_hours * entry.overtime_rate_per_hour as f64;

    // 3. Transport
    let uang_transport = match entry.transport_override {
        Some(v) => v,
        None => match config.uang_transport_mode {
            TransportMode::Flat => config.uang_transport_flat,
            TransportMode::PerDay => {
                config.uang_transport_per_hari * entry.hari_kerja_aktual as u64
            }
        },
    };

    // 4. Makan
    let uang_makan = match entry.makan_override {
        Some(v) => v,
        None => config.uang_makan_per_hari * entry.hari_kerja_aktual as u64,
    };

    // 5. Fasilitas — resolve effective item list then sum
    let fasilitas_items: Vec<FacilitasItem> = entry
        .fasilitas_override
        .as_ref()
        .unwrap_or(&employee.fasilitas)
        .clone();
    let fasilitas: u64 = fasilitas_items.iter().map(|i| i.amount).sum();

    // 6. BPJS Kesehatan — company policy: all members contribute based on the UMP cap,
    //    regardless of whether their salary is above or below it.
    let bpjs_kes_base = if employee.is_bpjs_kes_member {
        config.bpjs_kes_salary_cap as f64
    } else {
        0.0
    };
    let bpjs_kes_employee = bpjs_kes_base * config.bpjs_kes_employee_rate;
    let bpjs_kes_employer = bpjs_kes_base * config.bpjs_kes_employer_rate;

    // 7. BPJS TK (JHT, JKK, JKM) — salary capped at bpjs_tk_salary_cap
    let bpjs_tk_base = if employee.is_bpjs_tk_member {
        employee.gaji_pokok.min(config.bpjs_tk_salary_cap) as f64
    } else {
        0.0
    };
    let bpjs_jht_employee = bpjs_tk_base * config.bpjs_jht_employee_rate;
    let bpjs_jht_employer = bpjs_tk_base * config.bpjs_jht_employer_rate;
    let bpjs_jkk_employer = bpjs_tk_base * config.bpjs_jkk_employer_rate;
    let bpjs_jkm_employer = bpjs_tk_base * config.bpjs_jkm_employer_rate;

    // 8. PPH 21 — disabled per company decision; withheld externally
    let pph21 = 0.0_f64;

    // 9. Totals
    let total_pendapatan = gaji_prorata
        + overtime
        + uang_transport as f64
        + uang_makan as f64
        + entry.bonus as f64
        + fasilitas as f64;

    // 9b. Potongan internal — resolve from entry's deduction list
    let potongan_internal_items: Vec<DeductionItem> = entry.potongan_internal.clone();
    let potongan_internal: u64 = potongan_internal_items.iter().map(|i| i.amount).sum();

    let total_potongan = bpjs_kes_employee
        + bpjs_jht_employee
        + potongan_internal as f64;

    // Fasilitas are non-cash benefits; excluded from cash take-home pay
    let take_home_pay = total_pendapatan - fasilitas as f64 - total_potongan;

    Payslip {
        period: config.period.clone(),
        period_label: config.period_label.clone(),
        nik: employee.nik.clone(),
        nama: employee.nama.clone(),
        jabatan: employee.jabatan.clone(),
        status_ptkp: employee.status_ptkp.clone(),
        hari_kerja_config: config.hari_kerja,
        hari_kerja_aktual: entry.hari_kerja_aktual,
        gaji_pokok: employee.gaji_pokok,
        gaji_prorata,
        overtime,
        overtime_hours: entry.overtime_hours,
        overtime_rate_per_hour: entry.overtime_rate_per_hour,
        uang_transport,
        uang_makan,
        bonus: entry.bonus,
        fasilitas,
        fasilitas_items,
        bpjs_kes_employee,
        bpjs_jht_employee,
        pph21,
        potongan_internal,
        potongan_internal_items,
        bpjs_kes_employer,
        bpjs_jht_employer,
        bpjs_jkk_employer,
        bpjs_jkm_employer,
        total_pendapatan,
        total_potongan,
        take_home_pay,
    }
}

pub fn ptkp_value(status: &str) -> u64 {
    match status {
        "TK/0" => 54_000_000,
        "TK/1" => 58_500_000,
        "TK/2" => 63_000_000,
        "TK/3" => 67_500_000,
        "K/0" => 58_500_000,
        "K/1" => 63_000_000,
        "K/2" => 67_500_000,
        "K/3" => 72_000_000,
        _ => 0,
    }
}

/// Progressive tax using Indonesian PPH 21 brackets (2024)
pub fn progressive_tax(pkp: f64) -> f64 {
    let brackets: &[(f64, f64)] = &[
        (60_000_000.0, 0.05),
        (250_000_000.0, 0.15),
        (500_000_000.0, 0.25),
        (5_000_000_000.0, 0.30),
        (f64::MAX, 0.35),
    ];

    let mut tax = 0.0;
    let mut remaining = pkp;
    let mut prev_limit = 0.0_f64;

    for &(limit, rate) in brackets {
        if remaining <= 0.0 {
            break;
        }
        let bracket_size = limit - prev_limit;
        let taxable = remaining.min(bracket_size);
        tax += taxable * rate;
        remaining -= taxable;
        prev_limit = limit;
    }

    tax
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{DeductionItem, PayrollConfig, TransportMode};

    fn feb_config() -> PayrollConfig {
        PayrollConfig {
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
        }
    }

    fn emp(
        gaji_pokok: u64,
        tunjangan: u64,
        status_ptkp: &str,
        kes: bool,
        tk: bool,
    ) -> Employee {
        Employee {
            nik: "test".into(),
            nama: "Test".into(),
            jabatan: "Test".into(),
            gaji_pokok,
            tunjangan,
            status_ptkp: status_ptkp.into(),
            fasilitas: vec![],
            is_bpjs_kes_member: kes,
            is_bpjs_tk_member: tk,
        }
    }

    fn entry(hari_kerja_aktual: u32) -> PayrollEntry {
        PayrollEntry {
            nik: "test".into(),
            hari_kerja_aktual,
            overtime_hours: 0.0,
            overtime_rate_per_hour: 0,
            bonus: 0,
            potongan_internal: vec![],
            fasilitas_override: None,
            transport_override: None,
            makan_override: None,
        }
    }

    #[test]
    fn test_prorata_full_month() {
        let e = emp(18_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(19), &feb_config());
        assert_eq!(slip.gaji_prorata, 18_000_000.0);
    }

    #[test]
    fn test_prorata_partial_zwin() {
        // 5_730_000 / 19 * 14 = 4_222_105.263...
        let e = emp(5_730_000, 220_000, "", false, false);
        let slip = compute_payslip(&e, &entry(14), &feb_config());
        let expected = 5_730_000.0 / 19.0 * 14.0;
        assert!((slip.gaji_prorata - expected).abs() < 0.01);
    }

    #[test]
    fn test_prorata_partial_florencia() {
        // 5_000_000 / 19 * 7 = 1_842_105.263...
        let e = emp(5_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(7), &feb_config());
        let expected = 5_000_000.0 / 19.0 * 7.0;
        assert!((slip.gaji_prorata - expected).abs() < 0.01);
    }

    #[test]
    fn test_bpjs_kes_capped_dylan() {
        // Dylan: gaji_pokok=18M > cap=5,288,796
        // employee: 5_288_796 * 0.01 = 52_887.96
        // employer: 5_288_796 * 0.04 = 211_551.84
        let e = emp(18_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(19), &feb_config());
        assert!((slip.bpjs_kes_employee - 52_887.96).abs() < 0.01);
        assert!((slip.bpjs_kes_employer - 211_551.84).abs() < 0.01);
    }

    #[test]
    fn test_bpjs_tk_capped_dylan() {
        // Dylan: gaji_pokok=18M > tk_cap=5,000,000
        // JHT employee: 5_000_000 * 0.02 = 100_000
        let e = emp(18_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(19), &feb_config());
        assert!((slip.bpjs_jht_employee - 100_000.0).abs() < 0.01);
    }

    #[test]
    fn test_no_bpjs_for_non_member() {
        let e = emp(5_730_000, 220_000, "", false, false);
        let slip = compute_payslip(&e, &entry(14), &feb_config());
        assert_eq!(slip.bpjs_kes_employee, 0.0);
        assert_eq!(slip.bpjs_jht_employee, 0.0);
        assert_eq!(slip.bpjs_kes_employer, 0.0);
        assert_eq!(slip.bpjs_jht_employer, 0.0);
    }

    #[test]
    fn test_zero_transport_makan_override_pendik() {
        let e = emp(2_500_000, 0, "", false, false);
        let mut e_entry = entry(19);
        e_entry.transport_override = Some(0);
        e_entry.makan_override = Some(0);
        let slip = compute_payslip(&e, &e_entry, &feb_config());
        assert_eq!(slip.uang_transport, 0);
        assert_eq!(slip.uang_makan, 0);
        assert_eq!(slip.bpjs_kes_employee, 0.0);
        assert_eq!(slip.pph21, 0.0);
        assert_eq!(slip.take_home_pay, 2_500_000.0);
    }

    #[test]
    fn test_potongan_internal_kamit() {
        let e = emp(3_500_000, 220_000, "K/1", true, true);
        let mut e_entry = entry(19);
        e_entry.potongan_internal =
            vec![DeductionItem { name: "Cicilan Pinjaman".into(), amount: 400_000 }];
        let slip = compute_payslip(&e, &e_entry, &feb_config());
        assert_eq!(slip.pph21, 0.0);
        // BPJS Kes: cap(5_288_796)*0.01 = 52_887.96 (always cap-based per company policy)
        assert!((slip.bpjs_kes_employee - 52_887.96).abs() < 0.01);
        // BPJS JHT: min(3500000, 5000000)*0.02 = 70_000
        assert!((slip.bpjs_jht_employee - 70_000.0).abs() < 0.01);
        // transport = 220_000 (flat), makan = 25000*19 = 475_000
        // total_pendapatan = 3_500_000 + 220_000 + 475_000 = 4_195_000
        // total_potongan = 52_887.96 + 70_000 + 0 + 400_000 = 522_887.96
        // THP = 4_195_000 - 522_887.96 = 3_672_112.04
        assert!((slip.take_home_pay - 3_672_112.04).abs() < 1.0);
    }

    #[test]
    fn test_progressive_tax_bracket_1() {
        // 50M fully in first bracket (5%)
        assert!((progressive_tax(50_000_000.0) - 2_500_000.0).abs() < 0.01);
    }

    #[test]
    fn test_progressive_tax_bracket_2() {
        // 60M@5%=3M + 40M@15%=6M = 9M
        assert!((progressive_tax(100_000_000.0) - 9_000_000.0).abs() < 0.01);
    }

    #[test]
    fn test_progressive_tax_bracket_3() {
        // 60M@5%=3M + 190M@15%=28.5M + 50M@25%=12.5M = 44M
        assert!((progressive_tax(300_000_000.0) - 44_000_000.0).abs() < 0.01);
    }

    #[test]
    fn test_pph21_zero_below_ptkp() {
        // Annual gross = (3M + 220k) * 12 = 38.64M < PTKP TK/0 (54M) → PPH21 = 0
        let e = emp(3_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(19), &feb_config());
        assert_eq!(slip.pph21, 0.0);
    }

    #[test]
    fn test_makan_per_day() {
        // 25_000 * 19 = 475_000
        let e = emp(5_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(19), &feb_config());
        assert_eq!(slip.uang_makan, 475_000);
    }

    #[test]
    fn test_transport_flat() {
        let e = emp(5_000_000, 220_000, "TK/0", true, true);
        let slip = compute_payslip(&e, &entry(7), &feb_config());
        // Transport is flat regardless of days worked
        assert_eq!(slip.uang_transport, 220_000);
    }
}
