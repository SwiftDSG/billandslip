use actix_web::{web, HttpResponse, Responder};
use serde_json::json;

use crate::models::PayrollEntry;
use crate::services::calculation::compute_payslip;
use crate::services::pdf::generate_payslip_pdf;
use crate::AppState;

pub async fn get_payslip(
    path: web::Path<(String, String)>,
    state: web::Data<AppState>,
) -> impl Responder {
    let (period, nik) = path.into_inner();
    let store = state.store.data.read().await;

    let config = match store.payroll_configs.get(&period) {
        Some(c) => c.clone(),
        None => {
            return HttpResponse::NotFound()
                .json(json!({"error": "No payroll config for this period"}))
        }
    };

    let employee = match store.employees.iter().find(|e| e.nik == nik) {
        Some(e) => e.clone(),
        None => return HttpResponse::NotFound().json(json!({"error": "Employee not found"})),
    };

    let entry = store
        .payroll_entries
        .get(&period)
        .and_then(|entries| entries.iter().find(|e| e.nik == nik))
        .cloned()
        .unwrap_or_else(|| PayrollEntry::default_for(&nik, config.hari_kerja));

    let payslip = compute_payslip(&employee, &entry, &config);
    HttpResponse::Ok().json(&payslip)
}

pub async fn get_all_payslips(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> impl Responder {
    let period = path.into_inner();
    let store = state.store.data.read().await;

    let config = match store.payroll_configs.get(&period) {
        Some(c) => c.clone(),
        None => {
            return HttpResponse::NotFound()
                .json(json!({"error": "No payroll config for this period"}))
        }
    };

    let payslips: Vec<_> = store
        .employees
        .iter()
        .map(|emp| {
            let entry = store
                .payroll_entries
                .get(&period)
                .and_then(|entries| entries.iter().find(|e| e.nik == emp.nik))
                .cloned()
                .unwrap_or_else(|| PayrollEntry::default_for(&emp.nik, config.hari_kerja));
            compute_payslip(emp, &entry, &config)
        })
        .collect();

    HttpResponse::Ok().json(&payslips)
}

pub async fn get_pdf(
    path: web::Path<(String, String)>,
    state: web::Data<AppState>,
) -> impl Responder {
    let (period, nik) = path.into_inner();
    let store = state.store.data.read().await;

    let config = match store.payroll_configs.get(&period) {
        Some(c) => c.clone(),
        None => {
            return HttpResponse::NotFound()
                .json(json!({"error": "No payroll config for this period"}))
        }
    };

    let employee = match store.employees.iter().find(|e| e.nik == nik) {
        Some(e) => e.clone(),
        None => return HttpResponse::NotFound().json(json!({"error": "Employee not found"})),
    };

    let entry = store
        .payroll_entries
        .get(&period)
        .and_then(|entries| entries.iter().find(|e| e.nik == nik))
        .cloned()
        .unwrap_or_else(|| PayrollEntry::default_for(&nik, config.hari_kerja));

    drop(store);

    let payslip = compute_payslip(&employee, &entry, &config);

    match generate_payslip_pdf(&payslip) {
        Ok(pdf_bytes) => {
            let filename = format!("slip-{}-{}.pdf", period, nik);
            HttpResponse::Ok()
                .content_type("application/pdf")
                .insert_header((
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                ))
                .body(pdf_bytes)
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(json!({"error": e}))
        }
    }
}
