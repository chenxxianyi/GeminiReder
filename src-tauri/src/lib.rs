#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_zlib])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn open_zlib() -> Result<(), String> {
  const ZLIB_URL: &str = "https://z-library.sk/";
  open_external_url(ZLIB_URL)
}

#[cfg(target_os = "windows")]
fn open_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("cmd")
    .args(["/C", "start", "", url])
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}

#[cfg(target_os = "macos")]
fn open_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("open")
    .arg(url)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("xdg-open")
    .arg(url)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}
