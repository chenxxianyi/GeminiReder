use tauri::{Emitter, Manager};

const ZCODE_BROWSER_THEME_SCRIPT: &str = include_str!("browser_theme.js");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      open_zlib,
      open_external_url,
      browser_create,
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
async fn browser_create(
  app: tauri::AppHandle,
  url: String,
  x: f64,
  y: f64,
  width: f64,
  height: f64,
) -> Result<(), String> {
  if app.get_webview("browser-view").is_some() {
    return Ok(());
  }

  let parsed = parse_web_url(&url)?;
  let window = app
    .get_window("main")
    .ok_or_else(|| "main window is not ready".to_string())?;
  let event_app = app.clone();

  let builder = tauri::webview::WebviewBuilder::new(
    "browser-view",
    tauri::WebviewUrl::External(parsed),
  )
  .focused(false)
  .incognito(false)
  .devtools(cfg!(debug_assertions))
  .zoom_hotkeys_enabled(true)
  .initialization_script(ZCODE_BROWSER_THEME_SCRIPT)
  .on_new_window(move |url, _features| {
    if matches!(url.scheme(), "http" | "https") {
      let _ = event_app.emit_to("main", "browser-new-window", url.to_string());
    }
    tauri::webview::NewWindowResponse::Deny
  });

  window
    .add_child(
      builder,
      tauri::LogicalPosition::new(x, y),
      tauri::LogicalSize::new(width.max(2.0), height.max(2.0)),
    )
    .map(|_| ())
    .map_err(|error| format!("failed to create browser webview: {error}"))
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
