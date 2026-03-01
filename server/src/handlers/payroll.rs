use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Deserializer};
use serde_json::json;

use crate::models::{DeductionItem, FacilitasItem, PayrollConfig, PayrollEntry};
use crate::services::calculation::compute_payslip;
use crate::AppState;

/// Deserializes a field that can be absent (→ None), null (→ Some(None)), or a value (→ Some(Some(v))).
/// Standard serde cannot distinguish absent from null for Option<Option<T>>;
/// this helper wraps the deserialized inner Option in an outer Some.
fn deser_opt_opt<'de, T, D>(d: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Ok(Some(Option::deserialize(d)?))
}

// ── Config endpoints ──────────────────────────────────────────────────────────

pub async fn get_config(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> impl Responder {
    let period = path.into_inner();
    let store = state.store.data.read().await;
    match store.payroll_configs.get(&period) {
        Some(cfg) => HttpResponse::Ok().json(cfg),
        None => HttpResponse::NotFound().json(json!({"error": "Config not found for period"})),
    }
}

pub async fn upsert_config(
    path: web::Path<String>,
    state: web::Data<AppState>,
    body: web::Json<PayrollConfig>,
) -> impl Responder {
    let period = path.into_inner();
    let mut config = body.into_inner();
    config.period = period.clone();

    if config.hari_kerja == 0 {
        return HttpResponse::BadRequest().json(json!({"error": "hari_kerja must be > 0"}));
    }

    let mut store = state.store.data.write().await;
    store.payroll_configs.insert(period, config.clone());
    drop(store);
    state.store.persist().await;

    HttpResponse::Ok().json(&config)
}

// ── Payroll compute endpoints ─────────────────────────────────────────────────

pub async fn get_payroll(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> impl Responder {
    let period = path.into_inner();
    let mut store = state.store.data.write().await;

    let config = match store.payroll_configs.get(&period) {
        Some(c) => c.clone(),
        None => {
            return HttpResponse::NotFound()
                .json(json!({"error": "No payroll config found for this period"}))
        }
    };

    let employees = store.employees.clone();

    // Ensure every employee has a PayrollEntry for this period
    let entries = store
        .payroll_entries
        .entry(period.clone())
        .or_insert_with(Vec::new);

    for emp in &employees {
        if !entries.iter().any(|e| e.nik == emp.nik) {
            entries.push(PayrollEntry::default_for(&emp.nik, config.hari_kerja));
        }
    }
    let entries = entries.clone();
    drop(store);
    state.store.persist().await;

    let payslips: Vec<_> = employees
        .iter()
        .map(|emp| {
            let entry = entries
                .iter()
                .find(|e| e.nik == emp.nik)
                .cloned()
                .unwrap_or_else(|| PayrollEntry::default_for(&emp.nik, config.hari_kerja));
            compute_payslip(emp, &entry, &config)
        })
        .collect();

    HttpResponse::Ok().json(&payslips)
}

pub async fn get_entry(
    path: web::Path<(String, String)>,
    state: web::Data<AppState>,
) -> impl Responder {
    let (period, nik) = path.into_inner();
    let store = state.store.data.read().await;

    match store
        .payroll_entries
        .get(&period)
        .and_then(|entries| entries.iter().find(|e| e.nik == nik))
    {
        Some(entry) => HttpResponse::Ok().json(entry),
        None => HttpResponse::NotFound().json(json!({"error": "Entry not found"})),
    }
}

#[derive(Deserialize)]
pub struct UpdateEntryBody {
    pub hari_kerja_aktual: Option<u32>,
    pub overtime_hours: Option<f64>,
    pub overtime_rate_per_hour: Option<u64>,
    pub bonus: Option<u64>,
    pub potongan_internal: Option<Vec<DeductionItem>>,
    #[serde(default, deserialize_with = "deser_opt_opt")]
    pub fasilitas_override: Option<Option<Vec<FacilitasItem>>>,
    #[serde(default, deserialize_with = "deser_opt_opt")]
    pub transport_override: Option<Option<u64>>,
    #[serde(default, deserialize_with = "deser_opt_opt")]
    pub makan_override: Option<Option<u64>>,
}

pub async fn update_entry(
    path: web::Path<(String, String)>,
    state: web::Data<AppState>,
    body: web::Json<UpdateEntryBody>,
) -> impl Responder {
    let (period, nik) = path.into_inner();
    let patch = body.into_inner();

    let mut store = state.store.data.write().await;

    let config_hari_kerja = match store.payroll_configs.get(&period) {
        Some(c) => c.hari_kerja,
        None => {
            return HttpResponse::NotFound()
                .json(json!({"error": "No payroll config for this period"}))
        }
    };

    // Check employee existence before any mutable borrow
    let emp_exists = store.employees.iter().any(|e| e.nik == nik);
    if !emp_exists {
        return HttpResponse::NotFound().json(json!({"error": "Employee not found"}));
    }

    // Ensure entry exists for this employee in this period
    let has_entry = store
        .payroll_entries
        .get(&period)
        .map(|v| v.iter().any(|e| e.nik == nik))
        .unwrap_or(false);

    if !has_entry {
        store
            .payroll_entries
            .entry(period.clone())
            .or_default()
            .push(PayrollEntry::default_for(&nik, config_hari_kerja));
    }

    let entries = store.payroll_entries.get_mut(&period).unwrap();
    let entry = entries.iter_mut().find(|e| e.nik == nik).unwrap();

    if let Some(v) = patch.hari_kerja_aktual {
        entry.hari_kerja_aktual = v;
    }
    if let Some(v) = patch.overtime_hours {
        entry.overtime_hours = v;
    }
    if let Some(v) = patch.overtime_rate_per_hour {
        entry.overtime_rate_per_hour = v;
    }
    if let Some(v) = patch.bonus {
        entry.bonus = v;
    }
    if let Some(v) = patch.potongan_internal {
        entry.potongan_internal = v;
    }
    if let Some(v) = patch.fasilitas_override {
        entry.fasilitas_override = v;
    }
    if let Some(v) = patch.transport_override {
        entry.transport_override = v;
    }
    if let Some(v) = patch.makan_override {
        entry.makan_override = v;
    }

    let entry_clone = entry.clone();
    drop(store);
    state.store.persist().await;

    HttpResponse::Ok().json(&entry_clone)
}
