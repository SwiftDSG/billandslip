mod config;
mod handlers;
mod models;
mod services;
mod storage;

use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};

use config::Config;
use storage::JsonStore;

pub struct AppState {
    pub store: JsonStore,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let cfg = Config::default();

    println!("Loading data from {}", cfg.store_path);
    let store = JsonStore::load_or_create(&cfg.store_path).await;
    println!("Data loaded. Starting server on {}:{}", cfg.host, cfg.port);

    let data = web::Data::new(AppState { store });
    let addr = format!("{}:{}", cfg.host, cfg.port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .app_data(data.clone())
            .app_data(
                web::JsonConfig::default().error_handler(|err, _req| {
                    let msg = format!("{}", err);
                    actix_web::error::InternalError::from_response(
                        err,
                        actix_web::HttpResponse::BadRequest()
                            .json(serde_json::json!({"error": msg})),
                    )
                    .into()
                }),
            )
            // Employees
            .route(
                "/api/employees",
                web::get().to(handlers::employees::list_employees),
            )
            .route(
                "/api/employees",
                web::post().to(handlers::employees::create_employee),
            )
            .route(
                "/api/employees/{nik}",
                web::get().to(handlers::employees::get_employee),
            )
            .route(
                "/api/employees/{nik}",
                web::put().to(handlers::employees::update_employee),
            )
            .route(
                "/api/employees/{nik}",
                web::delete().to(handlers::employees::delete_employee),
            )
            // Payroll config
            .route(
                "/api/payroll/config/{period}",
                web::get().to(handlers::payroll::get_config),
            )
            .route(
                "/api/payroll/config/{period}",
                web::put().to(handlers::payroll::upsert_config),
            )
            // Payroll entries — IMPORTANT: specific routes before parameterised
            .route(
                "/api/payroll/{period}",
                web::get().to(handlers::payroll::get_payroll),
            )
            .route(
                "/api/payroll/{period}/{nik}",
                web::get().to(handlers::payroll::get_entry),
            )
            .route(
                "/api/payroll/{period}/{nik}",
                web::put().to(handlers::payroll::update_entry),
            )
            // Payslips — IMPORTANT: /all before /{nik}
            .route(
                "/api/payslip/{period}/all",
                web::get().to(handlers::payslip::get_all_payslips),
            )
            .route(
                "/api/payslip/{period}/{nik}",
                web::get().to(handlers::payslip::get_payslip),
            )
            .route(
                "/api/payslip/{period}/{nik}/pdf",
                web::get().to(handlers::payslip::get_pdf),
            )
    })
    .bind(addr)?
    .run()
    .await
}
