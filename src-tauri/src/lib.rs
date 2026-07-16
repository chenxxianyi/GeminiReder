use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      open_zlib,
      open_external_url,
      browser_navigate,
      browser_reload,
      browser_go_back,
      browser_go_forward,
      browser_current_url
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn open_zlib() -> Result<(), String> {
  const ZLIB_URL: &str = "https://z-library.sk/";
  launch_external_url(ZLIB_URL)
}

fn parse_web_url(url: &str) -> Result<tauri::Url, String> {
  let parsed = tauri::Url::parse(url).map_err(|error| format!("invalid URL: {error}"))?;
  match parsed.scheme() {
    "http" | "https" => Ok(parsed),
    _ => Err("only http and https URLs are allowed".into())
  }
}

fn browser_webview(app: &tauri::AppHandle) -> Result<tauri::Webview, String> {
  app
    .get_webview("browser-view")
    .ok_or_else(|| "browser webview is not ready".into())
}

#[tauri::command]
fn browser_navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
  let parsed = parse_web_url(&url)?;
  browser_webview(&app)?
    .navigate(parsed)
    .map_err(|error| format!("failed to navigate browser: {error}"))
}

#[tauri::command]
fn browser_reload(app: tauri::AppHandle) -> Result<(), String> {
  browser_webview(&app)?
    .reload()
    .map_err(|error| format!("failed to reload browser: {error}"))
}

#[tauri::command]
fn browser_go_back(app: tauri::AppHandle) -> Result<(), String> {
  browser_webview(&app)?
    .eval("window.history.back()")
    .map_err(|error| format!("failed to navigate back: {error}"))
}

#[tauri::command]
fn browser_go_forward(app: tauri::AppHandle) -> Result<(), String> {
  browser_webview(&app)?
    .eval("window.history.forward()")
    .map_err(|error| format!("failed to navigate forward: {error}"))
}

#[tauri::command]
fn browser_current_url(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let Some(webview) = app.get_webview("browser-view") else {
    return Ok(None);
  };
  webview
    .url()
    .map(|url| Some(url.to_string()))
    .map_err(|error| format!("failed to read browser URL: {error}"))
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
  let parsed = parse_web_url(&url)?;
  launch_external_url(parsed.as_str())
}

#[cfg(target_os = "windows")]
fn launch_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("rundll32.exe")
    .args(["url.dll,FileProtocolHandler", url])
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}

#[cfg(target_os = "macos")]
fn launch_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("open")
    .arg(url)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn launch_external_url(url: &str) -> Result<(), String> {
  std::process::Command::new("xdg-open")
    .arg(url)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("failed to open browser: {error}"))
}
