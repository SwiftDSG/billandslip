use genpdf::{
    elements::{self, Paragraph, TableLayout},
    fonts, style, Document, Element, PaperSize, SimplePageDecorator,
};

use crate::models::Payslip;

fn fmt_idr(v: f64) -> String {
    let rounded = v.round() as i64;
    let s = rounded.abs().to_string();
    let mut result = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push('.');
        }
        result.push(c);
    }
    let formatted: String = result.chars().rev().collect();
    if rounded < 0 {
        format!("-Rp {}", formatted)
    } else {
        format!("Rp {}", formatted)
    }
}

/// Normal cell: left-padded paragraph.
fn cell(text: &str) -> impl Element + 'static {
    Paragraph::new(text.to_owned()).padded(genpdf::Margins::trbl(1, 3, 1, 3))
}

/// Bold cell: left-padded bold paragraph.
fn bold_cell(text: &str) -> impl Element + 'static {
    Paragraph::new(text.to_owned())
        .styled(style::Style::new().with_font_size(10).bold())
        .padded(genpdf::Margins::trbl(2, 3, 2, 3))
}

pub fn generate_payslip_pdf(payslip: &Payslip) -> Result<Vec<u8>, String> {
    let font_dir = std::path::Path::new("assets/fonts");
    if !font_dir.exists() {
        return Err(
            "Font directory 'assets/fonts' not found. Please add Arial-Regular.ttf and Arial-Bold.ttf.".into(),
        );
    }

    let font_family = fonts::from_files(font_dir, "Arial", None)
        .map_err(|e| format!("Failed to load fonts: {}", e))?;

    let mut doc = Document::new(font_family);
    doc.set_title("Slip Gaji Karyawan");
    doc.set_paper_size(PaperSize::A4);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(15);
    doc.set_page_decorator(decorator);

    let default_style = style::Style::new().with_font_size(10);
    let bold_style = style::Style::new().with_font_size(10).bold();
    let title_style = style::Style::new().with_font_size(14).bold();
    let subtitle_style = style::Style::new().with_font_size(11);

    // --- Header ---
    doc.push(
        Paragraph::new("SLIP GAJI KARYAWAN")
            .styled(title_style)
            .padded(genpdf::Margins::trbl(0, 0, 2, 0)),
    );
    doc.push(
        Paragraph::new(format!("Periode: {}", payslip.period_label))
            .styled(subtitle_style)
            .padded(genpdf::Margins::trbl(0, 0, 8, 0)),
    );

    // --- Employee Info ---
    let mut info = TableLayout::new(vec![1, 3, 1, 3]);
    info.set_cell_decorator(elements::FrameCellDecorator::new(false, false, false));

    {
        let mut row = info.row();
        row.push_element(Paragraph::new("NIK").styled(bold_style));
        row.push_element(Paragraph::new(payslip.nik.clone()).styled(default_style));
        row.push_element(Paragraph::new("Jabatan").styled(bold_style));
        row.push_element(Paragraph::new(payslip.jabatan.clone()).styled(default_style));
        row.push().expect("row push failed");
    }
    {
        let mut row = info.row();
        row.push_element(Paragraph::new("Nama").styled(bold_style));
        row.push_element(Paragraph::new(payslip.nama.clone()).styled(default_style));
        row.push_element(Paragraph::new("Status PTKP").styled(bold_style));
        let ptkp_val = if payslip.status_ptkp.is_empty() { "—".into() } else { payslip.status_ptkp.clone() };
        row.push_element(Paragraph::new(ptkp_val).styled(default_style));
        row.push().expect("row push failed");
    }
    {
        let mut row = info.row();
        row.push_element(Paragraph::new("Hari Kerja").styled(bold_style));
        row.push_element(
            Paragraph::new(format!("{} dari {} hari", payslip.hari_kerja_aktual, payslip.hari_kerja_config))
                .styled(default_style),
        );
        row.push_element(Paragraph::new("").styled(default_style));
        row.push_element(Paragraph::new("").styled(default_style));
        row.push().expect("row push failed");
    }

    doc.push(info.padded(genpdf::Margins::trbl(0, 0, 6, 0)));

    // --- Build row data (matching web preview logic) ---
    let has_fasilitas = payslip.fasilitas_items.iter().any(|i| i.amount > 0);

    let mut income_rows: Vec<(String, String)> = vec![
        ("Gaji Pokok (Prorata)".into(), fmt_idr(payslip.gaji_prorata)),
        ("Uang Transport".into(), fmt_idr(payslip.uang_transport as f64)),
        ("Uang Makan".into(), fmt_idr(payslip.uang_makan as f64)),
    ];
    if payslip.bonus > 0 {
        income_rows.push(("Bonus".into(), fmt_idr(payslip.bonus as f64)));
    }
    if payslip.overtime > 0.0 {
        income_rows.push(("Overtime".into(), fmt_idr(payslip.overtime)));
    }
    // In 2-col mode, fasilitas items are listed inline with income
    if !has_fasilitas {
        for item in &payslip.fasilitas_items {
            if item.amount > 0 {
                income_rows.push((item.name.clone(), fmt_idr(item.amount as f64)));
            }
        }
    }

    let fas_rows: Vec<(String, String)> = payslip
        .fasilitas_items
        .iter()
        .filter(|i| i.amount > 0)
        .map(|i| (i.name.clone(), fmt_idr(i.amount as f64)))
        .collect();

    let mut deduct_rows: Vec<(String, String)> = vec![];
    if payslip.bpjs_kes_employee > 0.0 {
        deduct_rows.push(("BPJS Kesehatan".into(), fmt_idr(payslip.bpjs_kes_employee)));
    }
    if payslip.bpjs_jht_employee > 0.0 {
        deduct_rows.push(("BPJS JHT".into(), fmt_idr(payslip.bpjs_jht_employee)));
    }
    if payslip.pph21 > 0.0 {
        deduct_rows.push(("PPH 21".into(), fmt_idr(payslip.pph21)));
    }
    for item in &payslip.potongan_internal_items {
        if item.amount > 0 {
            deduct_rows.push((item.name.clone(), fmt_idr(item.amount as f64)));
        }
    }

    // Income total for PENDAPATAN column (excludes fasilitas in 3-col mode)
    let income_total_display = if has_fasilitas {
        payslip.total_pendapatan - payslip.fasilitas as f64
    } else {
        payslip.total_pendapatan
    };

    // --- Main income/deduction table ---
    if has_fasilitas {
        // 3-column layout: PENDAPATAN | FASILITAS | POTONGAN
        let mut table = TableLayout::new(vec![4, 3, 3, 3, 4, 3]);
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, false));

        {
            let mut row = table.row();
            row.push_element(bold_cell("PENDAPATAN"));
            row.push_element(bold_cell("JUMLAH"));
            row.push_element(bold_cell("FASILITAS"));
            row.push_element(bold_cell("JUMLAH"));
            row.push_element(bold_cell("POTONGAN"));
            row.push_element(bold_cell("JUMLAH"));
            row.push().expect("header row push failed");
        }

        let max_rows = income_rows.len().max(fas_rows.len()).max(deduct_rows.len());
        for i in 0..max_rows {
            let (il, iv) = income_rows.get(i).map(|(l, v)| (l.as_str(), v.as_str())).unwrap_or(("", ""));
            let (fl, fv) = fas_rows.get(i).map(|(l, v)| (l.as_str(), v.as_str())).unwrap_or(("", ""));
            let (dl, dv) = deduct_rows.get(i).map(|(l, v)| (l.as_str(), v.as_str())).unwrap_or(("", ""));
            let mut row = table.row();
            row.push_element(cell(il));
            row.push_element(cell(iv));
            row.push_element(cell(fl));
            row.push_element(cell(fv));
            row.push_element(cell(dl));
            row.push_element(cell(dv));
            row.push().expect("data row push failed");
        }

        {
            let mut row = table.row();
            row.push_element(bold_cell("TOTAL PENDAPATAN"));
            row.push_element(bold_cell(&fmt_idr(income_total_display)));
            row.push_element(bold_cell("TOTAL FASILITAS"));
            row.push_element(bold_cell(&fmt_idr(payslip.fasilitas as f64)));
            row.push_element(bold_cell("TOTAL POTONGAN"));
            row.push_element(bold_cell(&fmt_idr(payslip.total_potongan)));
            row.push().expect("totals row push failed");
        }

        doc.push(table.padded(genpdf::Margins::trbl(0, 0, 6, 0)));
    } else {
        // 2-column layout: PENDAPATAN | POTONGAN
        let mut table = TableLayout::new(vec![4, 3, 4, 3]);
        table.set_cell_decorator(elements::FrameCellDecorator::new(true, true, false));

        {
            let mut row = table.row();
            row.push_element(bold_cell("PENDAPATAN"));
            row.push_element(bold_cell("JUMLAH"));
            row.push_element(bold_cell("POTONGAN"));
            row.push_element(bold_cell("JUMLAH"));
            row.push().expect("header row push failed");
        }

        let max_rows = income_rows.len().max(deduct_rows.len());
        for i in 0..max_rows {
            let (il, iv) = income_rows.get(i).map(|(l, v)| (l.as_str(), v.as_str())).unwrap_or(("", ""));
            let (dl, dv) = deduct_rows.get(i).map(|(l, v)| (l.as_str(), v.as_str())).unwrap_or(("", ""));
            let mut row = table.row();
            row.push_element(cell(il));
            row.push_element(cell(iv));
            row.push_element(cell(dl));
            row.push_element(cell(dv));
            row.push().expect("data row push failed");
        }

        {
            let mut row = table.row();
            row.push_element(bold_cell("TOTAL PENDAPATAN"));
            row.push_element(bold_cell(&fmt_idr(income_total_display)));
            row.push_element(bold_cell("TOTAL POTONGAN"));
            row.push_element(bold_cell(&fmt_idr(payslip.total_potongan)));
            row.push().expect("totals row push failed");
        }

        doc.push(table.padded(genpdf::Margins::trbl(0, 0, 6, 0)));
    }

    // --- Take Home Pay ---
    doc.push(
        Paragraph::new(format!("TAKE HOME PAY:  {}", fmt_idr(payslip.take_home_pay)))
            .styled(style::Style::new().with_font_size(13).bold())
            .padded(genpdf::Margins::trbl(4, 4, 4, 0)),
    );

    // --- Employer BPJS (informational, only shown when relevant) ---
    if payslip.bpjs_kes_employer > 0.0 || payslip.bpjs_jht_employer > 0.0 {
        doc.push(
            Paragraph::new("Kontribusi Perusahaan (Informasi)")
                .styled(bold_style)
                .padded(genpdf::Margins::trbl(8, 0, 2, 0)),
        );

        let mut emp_table = TableLayout::new(vec![3, 2, 3, 2]);
        emp_table.set_cell_decorator(elements::FrameCellDecorator::new(false, false, false));

        {
            let mut row = emp_table.row();
            row.push_element(Paragraph::new("BPJS Kes (Perusahaan)").styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new(fmt_idr(payslip.bpjs_kes_employer)).styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new("BPJS JHT (Perusahaan)").styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new(fmt_idr(payslip.bpjs_jht_employer)).styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push().unwrap();
        }
        {
            let mut row = emp_table.row();
            row.push_element(Paragraph::new("BPJS JKK (Perusahaan)").styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new(fmt_idr(payslip.bpjs_jkk_employer)).styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new("BPJS JKM (Perusahaan)").styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push_element(Paragraph::new(fmt_idr(payslip.bpjs_jkm_employer)).styled(default_style).padded(genpdf::Margins::trbl(1, 2, 1, 0)));
            row.push().unwrap();
        }

        doc.push(emp_table);
    }

    // --- Footer ---
    doc.push(
        Paragraph::new("PPH 21 dihitung menggunakan metode progresif tahunan (PMK 252/2008). Dokumen ini digenerate secara otomatis.")
            .styled(style::Style::new().with_font_size(8))
            .padded(genpdf::Margins::trbl(8, 0, 0, 0)),
    );

    let mut buf = Vec::new();
    doc.render(&mut buf)
        .map_err(|e| format!("Failed to render PDF: {}", e))?;

    Ok(buf)
}
