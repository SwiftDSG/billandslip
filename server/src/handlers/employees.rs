use actix_web::{web, HttpResponse, Responder};
use serde_json::json;

use crate::models::Employee;
use crate::AppState;

pub async fn list_employees(state: web::Data<AppState>) -> impl Responder {
    let store = state.store.data.read().await;
    HttpResponse::Ok().json(&store.employees)
}

pub async fn get_employee(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> impl Responder {
    let nik = path.into_inner();
    let store = state.store.data.read().await;
    match store.employees.iter().find(|e| e.nik == nik) {
        Some(e) => HttpResponse::Ok().json(e),
        None => HttpResponse::NotFound().json(json!({"error": "Employee not found"})),
    }
}

pub async fn create_employee(
    state: web::Data<AppState>,
    body: web::Json<Employee>,
) -> impl Responder {
    let employee = body.into_inner();

    if employee.nik.trim().is_empty() {
        return HttpResponse::BadRequest().json(json!({"error": "NIK is required"}));
    }
    if employee.gaji_pokok == 0 {
        return HttpResponse::BadRequest().json(json!({"error": "Gaji pokok must be > 0"}));
    }

    let mut store = state.store.data.write().await;
    if store.employees.iter().any(|e| e.nik == employee.nik) {
        return HttpResponse::Conflict().json(json!({"error": "Employee with this NIK already exists"}));
    }

    store.employees.push(employee.clone());
    drop(store);
    state.store.persist().await;

    HttpResponse::Created().json(&employee)
}

pub async fn update_employee(
    path: web::Path<String>,
    state: web::Data<AppState>,
    body: web::Json<Employee>,
) -> impl Responder {
    let nik = path.into_inner();
    let mut updated = body.into_inner();
    // NIK in the path is authoritative
    updated.nik = nik.clone();

    if updated.gaji_pokok == 0 {
        return HttpResponse::BadRequest().json(json!({"error": "Gaji pokok must be > 0"}));
    }

    let mut store = state.store.data.write().await;
    match store.employees.iter_mut().find(|e| e.nik == nik) {
        Some(emp) => {
            *emp = updated.clone();
            drop(store);
            state.store.persist().await;
            HttpResponse::Ok().json(&updated)
        }
        None => HttpResponse::NotFound().json(json!({"error": "Employee not found"})),
    }
}

pub async fn delete_employee(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> impl Responder {
    let nik = path.into_inner();
    let mut store = state.store.data.write().await;

    let before = store.employees.len();
    store.employees.retain(|e| e.nik != nik);

    if store.employees.len() == before {
        return HttpResponse::NotFound().json(json!({"error": "Employee not found"}));
    }

    // Remove all payroll entries for this NIK across all periods
    for entries in store.payroll_entries.values_mut() {
        entries.retain(|e| e.nik != nik);
    }

    drop(store);
    state.store.persist().await;

    HttpResponse::Ok().json(json!({"message": "Employee deleted"}))
}
