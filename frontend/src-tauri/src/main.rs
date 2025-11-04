// Hide console window in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]  // Suppress unused code warnings

mod updater;

// Additional console hiding for Windows
#[cfg(windows)]
fn hide_console_window() {
    unsafe {
        let console_window = winapi::um::wincon::GetConsoleWindow();
        if !console_window.is_null() {
            winapi::um::winuser::ShowWindow(console_window, winapi::um::winuser::SW_HIDE);
        }
        
        // Also try to free the console
        winapi::um::wincon::FreeConsole();
    }
}

#[cfg(not(windows))]
fn hide_console_window() {
    // No-op on non-Windows platforms
}

use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use simplelog::{Config, LevelFilter, WriteLogger, CombinedLogger, TermLogger, TerminalMode, ColorChoice};
use tauri::{AppHandle, Emitter, Manager};
use which::which;

#[derive(Debug, Clone)]
pub struct BackendConfig {
    pub jar_path: PathBuf,
    pub java_path: PathBuf,
    pub data_dir: PathBuf,
    pub port: u16,
    pub startup_timeout: Duration,
    pub health_check_interval: Duration,
    pub max_restart_attempts: u32,
}

#[derive(Debug)]
pub struct BackendProcess {
    pub child: Child,
    pub pid: u32,
    pub started_at: Instant,
    pub last_health_check: Instant,
    pub consecutive_failures: u32,
    pub restart_attempts: u32,
}

// Health monitoring data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub database: DatabaseStatus,
    pub timestamp: String,
    pub uptime: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStatus {
    pub connected: bool,
    pub url: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedHealthStatus {
    pub backend_status: BackendStatus,
    pub last_check: String,
    pub consecutive_failures: u32,
    pub uptime_seconds: Option<u64>,
    pub process_id: Option<u32>,
    pub database_status: Option<DatabaseStatus>,
    pub error_details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackendStatus {
    Starting,
    Healthy,
    Unhealthy(String),
    ProcessDead,
    DatabaseDown,
    RestartRequired,
    ConnectionTimeout,
    PortConflict,
    JavaNotFound,
    JarNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthCheckError {
    NetworkError(String),
    TimeoutError,
    InvalidResponse(String),
    ProcessNotRunning,
    DatabaseConnectionFailed(String),
    UnknownError(String),
}

// Error recovery system structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryAction {
    ShowInstallDialog(String),
    ExtractFromResources,
    TryAlternatePorts(Vec<u16>),
    RestartWithDelay(u64),
    RepairDatabase,
    ClearCache,
    ResetConfiguration,
    ShowTroubleshootingGuide(String),
    ContactSupport(String),
    NoAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorRecoveryInfo {
    pub error_type: String,
    pub error_message: String,
    pub user_message: String,
    pub recovery_actions: Vec<RecoveryAction>,
    pub technical_details: Option<String>,
    pub timestamp: String,
    pub severity: ErrorSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone)]
pub struct ErrorRecoverySystem {
    pub max_retry_attempts: u32,
    pub retry_delays: Vec<Duration>,
    pub fallback_ports: Vec<u16>,
    pub recovery_strategies: std::collections::HashMap<String, RecoveryAction>,
}

// Comprehensive Logging System Structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub component: String,
    pub message: String,
    pub context: Option<serde_json::Value>,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticInfo {
    pub system_info: SystemInfo,
    pub application_info: ApplicationInfo,
    pub backend_info: BackendInfo,
    pub recent_logs: Vec<LogEntry>,
    pub error_history: Vec<ErrorRecoveryInfo>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub java_version: Option<String>,
    pub available_memory: u64,
    pub disk_space: u64,
    pub network_connectivity: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationInfo {
    pub version: String,
    pub build_date: String,
    pub data_directory: String,
    pub log_directory: String,
    pub uptime_seconds: u64,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendInfo {
    pub status: String,
    pub port: u16,
    pub process_id: Option<u32>,
    pub uptime_seconds: Option<u64>,
    pub restart_count: u32,
    pub last_health_check: String,
    pub database_status: Option<DatabaseStatus>,
}

#[derive(Debug)]
pub struct LoggingSystem {
    pub log_dir: PathBuf,
    pub max_log_size: u64,
    pub max_log_files: u32,
    pub session_id: String,
    pub log_buffer: Arc<Mutex<Vec<LogEntry>>>,
    pub error_history: Arc<Mutex<Vec<ErrorRecoveryInfo>>>,
}

pub struct AppState {
    pub backend_process: Mutex<Option<BackendProcess>>,
    pub backend_config: Mutex<Option<BackendConfig>>,
    pub backend_status: Arc<Mutex<BackendStatus>>,
    pub error_recovery: Mutex<ErrorRecoverySystem>,
    pub logging_system: Mutex<LoggingSystem>,
}

// Enhanced Tauri commands for health monitoring
#[tauri::command]
async fn stop_backend_process(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Manual backend stop requested");
    
    let state = app_handle.state::<AppState>();
    let mut process_guard = state.backend_process.lock().unwrap();
    
    if let Some(mut process) = process_guard.take() {
        log::info!("Stopping backend process (PID: {})", process.pid);
        
        // First try graceful shutdown
        if let Err(e) = process.child.kill() {
            log::error!("Failed to kill backend process: {}", e);
            return Err(format!("Failed to stop backend process: {}", e));
        }
        
        match process.child.wait() {
            Ok(exit_status) => {
                log::info!("Backend process stopped with status: {}", exit_status);
                Ok(format!("Backend process stopped successfully (exit status: {})", exit_status))
            }
            Err(e) => {
                log::warn!("Error waiting for process termination: {}", e);
                Ok("Backend process stopped (may have already terminated)".to_string())
            }
        }
    } else {
        Ok("No backend process is currently running".to_string())
    }
}

// Enhanced Tauri commands for health monitoring
#[tauri::command]
async fn get_detailed_health_status(app_handle: tauri::AppHandle) -> Result<DetailedHealthStatus, String> {
    let state = app_handle.state::<AppState>();
    let status = state.backend_status.lock().unwrap().clone();
    
    let (process_id, uptime_seconds, consecutive_failures) = {
        let process_guard = state.backend_process.lock().unwrap();
        if let Some(ref process) = *process_guard {
            (Some(process.pid), Some(process.started_at.elapsed().as_secs()), process.consecutive_failures)
        } else {
            (None, None, 0)
        }
    };
    
    let port = {
        let config_guard = state.backend_config.lock().unwrap();
        config_guard.as_ref().map(|c| c.port).unwrap_or(8082)
    };
    
    let (database_status, error_details) = match check_backend_health_detailed(port).await {
        Ok(health_response) => (Some(health_response.database), None),
        Err(e) => (None, Some(format!("{:?}", e))),
    };
    
    Ok(DetailedHealthStatus {
        backend_status: status,
        last_check: chrono::Utc::now().to_rfc3339(),
        consecutive_failures,
        uptime_seconds,
        process_id,
        database_status,
        error_details,
    })
}

#[tauri::command]
async fn trigger_health_check(app_handle: tauri::AppHandle) -> Result<HealthResponse, String> {
    log::info!("Manual health check triggered");
    
    let port = {
        let state = app_handle.state::<AppState>();
        let config_guard = state.backend_config.lock().unwrap();
        config_guard.as_ref().map(|c| c.port).unwrap_or(8082)
    };
    
    match perform_health_check_with_backoff(port, 3, Duration::from_millis(500)).await {
        Ok(health_response) => {
            let state = app_handle.state::<AppState>();
            let mut status = state.backend_status.lock().unwrap();
            *status = BackendStatus::Healthy;
            
            let _ = app_handle.emit("manual-health-check-result", serde_json::json!({
                "success": true,
                "health_response": health_response,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            
            log::info!("Manual health check successful");
            Ok(health_response)
        }
        Err(e) => {
            let state = app_handle.state::<AppState>();
            let mut status = state.backend_status.lock().unwrap();
            *status = match e {
                HealthCheckError::TimeoutError => BackendStatus::ConnectionTimeout,
                HealthCheckError::ProcessNotRunning => BackendStatus::ProcessDead,
                HealthCheckError::DatabaseConnectionFailed(_) => BackendStatus::DatabaseDown,
                _ => BackendStatus::Unhealthy(format!("{:?}", e)),
            };
            
            let _ = app_handle.emit("manual-health-check-result", serde_json::json!({
                "success": false,
                "error": format!("{:?}", e),
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            
            log::warn!("Manual health check failed: {:?}", e);
            Err(format!("{:?}", e))
        }
    }
}

#[tauri::command]
async fn start_health_monitoring(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Starting health monitoring system");
    
    let state = app_handle.state::<AppState>();
    let backend_status = state.backend_status.clone();
    let app_handle_clone = app_handle.clone();
    
    tokio::spawn(async move {
        monitor_backend_process(app_handle_clone, backend_status).await;
    });
    
    Ok("Health monitoring started".to_string())
}

#[tauri::command]
async fn check_backend_health(app_handle: tauri::AppHandle) -> Result<String, String> {
    let port = {
        let state = app_handle.state::<AppState>();
        let config_guard = state.backend_config.lock().unwrap();
        config_guard.as_ref().map(|c| c.port).unwrap_or(8082)
    };
    
    match check_backend_health_internal(port).await {
        Ok(()) => Ok("Backend is healthy".to_string()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
async fn wait_for_backend_ready(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Waiting for backend to be ready...");
    
    let port = {
        let state = app_handle.state::<AppState>();
        let config_guard = state.backend_config.lock().unwrap();
        config_guard.as_ref().map(|c| c.port).unwrap_or(8082)
    };
    
    for attempt in 1..=60 {
        match check_backend_health_internal(port).await {
            Ok(()) => {
                log::info!("Backend is ready after {} seconds", attempt);
                return Ok("Backend is ready".to_string());
            }
            Err(_) => {
                if attempt % 5 == 0 {
                    log::info!("Still waiting for backend... (attempt {})", attempt);
                    let _ = app_handle.emit("backend-startup-progress", format!("Starting backend... ({}/60s)", attempt));
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }
    }
    
    Err("Backend failed to start within 60 seconds".to_string())
}

#[tauri::command]
async fn get_backend_status(app_handle: tauri::AppHandle) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let status = state.backend_status.lock().unwrap();
    
    match &*status {
        BackendStatus::Starting => Ok("starting".to_string()),
        BackendStatus::Healthy => Ok("healthy".to_string()),
        BackendStatus::Unhealthy(msg) => Ok(format!("unhealthy: {}", msg)),
        BackendStatus::ProcessDead => Ok("process_dead".to_string()),
        BackendStatus::DatabaseDown => Ok("database_down".to_string()),
        BackendStatus::RestartRequired => Ok("restart_required".to_string()),
        BackendStatus::ConnectionTimeout => Ok("connection_timeout".to_string()),
        BackendStatus::PortConflict => Ok("port_conflict".to_string()),
        BackendStatus::JavaNotFound => Ok("java_not_found".to_string()),
        BackendStatus::JarNotFound => Ok("jar_not_found".to_string()),
    }
}

#[tauri::command]
async fn restart_backend(app_handle: tauri::AppHandle) -> Result<String, String> {
    log::info!("Manual backend restart requested");
    
    let state = app_handle.state::<AppState>();
    let config_guard = state.backend_config.lock().unwrap();
    let config = config_guard.as_ref().ok_or("Backend configuration not available")?;
    
    let mut process_guard = state.backend_process.lock().unwrap();
    
    match restart_backend_process(&app_handle, config, &mut process_guard) {
        Ok(()) => {
            let mut status = state.backend_status.lock().unwrap();
            *status = BackendStatus::Starting;
            Ok("Backend restart initiated".to_string())
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
async fn get_data_directory_info(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let mut info = serde_json::Map::new();
    info.insert("data_directory".to_string(), serde_json::Value::String(data_dir.display().to_string()));
    
    let subdirs = vec!["data", "logs", "backups", "temp", "uploads"];
    let mut subdir_info = serde_json::Map::new();
    
    for subdir in subdirs {
        let subdir_path = data_dir.join(subdir);
        let mut dir_info = serde_json::Map::new();
        
        if subdir_path.exists() {
            match get_directory_info(&subdir_path) {
                Ok((size, count)) => {
                    dir_info.insert("exists".to_string(), serde_json::Value::Bool(true));
                    dir_info.insert("size_bytes".to_string(), serde_json::Value::Number(serde_json::Number::from(size)));
                    dir_info.insert("file_count".to_string(), serde_json::Value::Number(serde_json::Number::from(count)));
                }
                Err(e) => {
                    dir_info.insert("exists".to_string(), serde_json::Value::Bool(true));
                    dir_info.insert("error".to_string(), serde_json::Value::String(e));
                }
            }
        } else {
            dir_info.insert("exists".to_string(), serde_json::Value::Bool(false));
        }
        
        subdir_info.insert(subdir.to_string(), serde_json::Value::Object(dir_info));
    }
    
    info.insert("subdirectories".to_string(), serde_json::Value::Object(subdir_info));
    
    Ok(serde_json::Value::Object(info))
}

#[tauri::command]
async fn cleanup_data_directory(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    log::info!("Manual data directory cleanup requested");
    
    cleanup_temporary_files(&data_dir)?;
    let backups_dir = data_dir.join("backups");
    cleanup_old_backups(&backups_dir)?;
    
    Ok("Data directory cleanup completed".to_string())
}

#[tauri::command]
async fn create_database_backup(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    log::info!("Manual database backup requested");
    
    let db_file = data_dir.join("data").join("db.mv.db");
    if !db_file.exists() {
        return Err("No database file found to backup".to_string());
    }
    
    let backups_dir = data_dir.join("backups");
    let backup_file = backups_dir.join(format!("db_manual_backup_{}.mv.db", 
        chrono::Utc::now().format("%Y%m%d_%H%M%S")));
    
    std::fs::copy(&db_file, &backup_file)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    Ok(format!("Database backup created: {}", backup_file.display()))
}

// Error Recovery Tauri Commands
#[tauri::command]
async fn analyze_error(app_handle: tauri::AppHandle, error_message: String) -> Result<ErrorRecoveryInfo, String> {
    let state = app_handle.state::<AppState>();
    let recovery_system = state.error_recovery.lock().unwrap();
    
    let recovery_info = recovery_system.analyze_error(&error_message);
    log::info!("Error analyzed: {} (severity: {:?})", error_message, recovery_info.severity);
    
    Ok(recovery_info)
}

#[tauri::command]
async fn attempt_error_recovery(app_handle: tauri::AppHandle, recovery_action: RecoveryAction) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let recovery_system = {
        let guard = state.error_recovery.lock().unwrap();
        guard.clone()
    };
    
    log::info!("Attempting manual error recovery: {:?}", recovery_action);
    
    match recovery_system.attempt_recovery(&recovery_action, &app_handle).await {
        Ok(result) => {
            log::info!("Manual error recovery successful: {}", result);
            let _ = app_handle.emit("recovery-successful", serde_json::json!({
                "recovery_action": format!("{:?}", recovery_action),
                "result": result,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            Ok(result)
        }
        Err(e) => {
            log::warn!("Manual error recovery failed: {}", e);
            let _ = app_handle.emit("recovery-failed", serde_json::json!({
                "recovery_action": format!("{:?}", recovery_action),
                "error": e,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
            Err(e)
        }
    }
}

#[tauri::command]
async fn get_recovery_suggestions(app_handle: tauri::AppHandle, error_type: String) -> Result<Vec<RecoveryAction>, String> {
    let state = app_handle.state::<AppState>();
    let recovery_system = state.error_recovery.lock().unwrap();
    
    let recovery_info = recovery_system.analyze_error(&error_type);
    Ok(recovery_info.recovery_actions)
}
#[tauri::command]
async fn trigger_automatic_recovery(app_handle: tauri::AppHandle, error_message: String) -> Result<String, String> {
    log::info!("Triggering automatic recovery for error: {}", error_message);
    
    // Clone the recovery system to avoid holding the lock across await
    let recovery_system = {
        let state = app_handle.state::<AppState>();
        let x = state.error_recovery.lock().unwrap().clone(); x
    };
    
    let recovery_info = handle_error_with_recovery(error_message, &app_handle, &recovery_system).await;
    
    Ok(format!("Automatic recovery initiated for error type: {}", recovery_info.error_type))
}

// Comprehensive Logging System Tauri Commands
#[tauri::command]
async fn get_diagnostic_info(app_handle: tauri::AppHandle) -> Result<DiagnosticInfo, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    log::info!("Collecting diagnostic information");
    
    match logging_system.collect_diagnostic_info(&app_handle) {
        Ok(diagnostic_info) => {
            log::info!("Diagnostic information collected successfully");
            Ok(diagnostic_info)
        }
        Err(e) => {
            log::error!("Failed to collect diagnostic information: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
async fn get_recent_logs(app_handle: tauri::AppHandle, limit: Option<usize>) -> Result<Vec<LogEntry>, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    let buffer = logging_system.log_buffer.lock().unwrap();
    let limit = limit.unwrap_or(50);
    
    let recent_logs: Vec<LogEntry> = buffer
        .iter()
        .rev()
        .take(limit)
        .cloned()
        .collect();
    
    Ok(recent_logs)
}

#[tauri::command]
async fn get_error_history(app_handle: tauri::AppHandle) -> Result<Vec<ErrorRecoveryInfo>, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    let history = logging_system.error_history.lock().unwrap();
    Ok(history.clone())
}

#[tauri::command]
async fn export_logs(app_handle: tauri::AppHandle) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    log::info!("Exporting logs for support");
    
    let diagnostic_info = logging_system.collect_diagnostic_info(&app_handle)
        .map_err(|e| format!("Failed to collect diagnostic info: {}", e))?;
    
    let export_file = logging_system.log_dir.join(format!("diagnostic_export_{}.json", 
        chrono::Utc::now().format("%Y%m%d_%H%M%S")));
    
    let json_content = serde_json::to_string_pretty(&diagnostic_info)
        .map_err(|e| format!("Failed to serialize diagnostic info: {}", e))?;
    
    std::fs::write(&export_file, json_content)
        .map_err(|e| format!("Failed to write export file: {}", e))?;
    
    log::info!("Logs exported to: {}", export_file.display());
    Ok(export_file.display().to_string())
}

#[tauri::command]
async fn clear_logs(app_handle: tauri::AppHandle) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    log::info!("Clearing application logs");
    
    {
        let mut buffer = logging_system.log_buffer.lock().unwrap();
        buffer.clear();
    }
    
    {
        let mut history = logging_system.error_history.lock().unwrap();
        history.clear();
    }
    
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let log_files = vec!["app.log", "backend.log", "errors.log", "structured.jsonl"];
    
    for log_file in log_files {
        let current_path = logging_system.log_dir.join(log_file);
        if current_path.exists() {
            let archive_path = logging_system.log_dir.join(format!("{}.{}.archived", log_file, timestamp));
            if let Err(e) = std::fs::rename(&current_path, &archive_path) {
                log::warn!("Failed to archive log file {}: {}", log_file, e);
            }
        }
    }
    
    log::info!("Logs cleared and archived");
    Ok("Logs cleared successfully".to_string())
}

#[tauri::command]
async fn log_structured_message(
    app_handle: tauri::AppHandle,
    level: String,
    component: String,
    message: String,
    context: Option<serde_json::Value>
) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let logging_system = state.logging_system.lock().unwrap();
    
    logging_system.log_structured(&level, &component, &message, context);
    
    match level.as_str() {
        "ERROR" => log::error!("[{}] {}", component, message),
        "WARN" => log::warn!("[{}] {}", component, message),
        "INFO" => log::info!("[{}] {}", component, message),
        "DEBUG" => log::debug!("[{}] {}", component, message),
        _ => log::info!("[{}] {}", component, message),
    }
    
    Ok("Message logged successfully".to_string())
}

fn get_directory_info(dir_path: &PathBuf) -> Result<(u64, u64), String> {
    let mut total_size = 0u64;
    let mut file_count = 0u64;
    
    fn visit_dir(dir: &PathBuf, size: &mut u64, count: &mut u64) -> Result<(), std::io::Error> {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            let metadata = path.metadata()?;
            
            if metadata.is_file() {
                *size += metadata.len();
                *count += 1;
            } else if metadata.is_dir() {
                visit_dir(&path, size, count)?;
            }
        }
        Ok(())
    }
    
    visit_dir(dir_path, &mut total_size, &mut file_count)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    Ok((total_size, file_count))
}

fn setup_logging(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = app_handle
        .path()
        .app_log_dir()?;
    fs::create_dir_all(&log_dir)?;
    let log_file = File::create(log_dir.join("app.log"))?;

    WriteLogger::init(LevelFilter::Info, Config::default(), log_file)?;
    log::info!("Logging initialized.");
    Ok(())
}

// Comprehensive Logging System Implementation
impl LoggingSystem {
    fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let log_dir = app_handle
            .path()
            .app_log_dir()
            .map_err(|e| format!("Failed to get log directory: {}", e))?;
        
        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("Failed to create log directory: {}", e))?;
        
        let session_id = uuid::Uuid::new_v4().to_string();
        
        Ok(Self {
            log_dir,
            max_log_size: 10 * 1024 * 1024,
            max_log_files: 5,
            session_id,
            log_buffer: Arc::new(Mutex::new(Vec::new())),
            error_history: Arc::new(Mutex::new(Vec::new())),
        })
    }
    
    fn setup_enhanced_logging(&self) -> Result<(), String> {
        let app_log_file = self.log_dir.join("app.log");
        let backend_log_file = self.log_dir.join("backend.log");
        let error_log_file = self.log_dir.join("errors.log");
        
        self.rotate_log_if_needed(&app_log_file)?;
        self.rotate_log_if_needed(&backend_log_file)?;
        self.rotate_log_if_needed(&error_log_file)?;
        
        let config = Config::default();
        
        let loggers: Vec<Box<dyn simplelog::SharedLogger>> = vec![
            TermLogger::new(
                LevelFilter::Info,
                config.clone(),
                TerminalMode::Mixed,
                ColorChoice::Auto,
            ),
            WriteLogger::new(
                LevelFilter::Debug,
                config.clone(),
                File::create(&app_log_file).map_err(|e| format!("Failed to create app log file: {}", e))?,
            ),
            WriteLogger::new(
                LevelFilter::Error,
                config,
                File::create(&error_log_file).map_err(|e| format!("Failed to create error log file: {}", e))?,
            ),
        ];
        
        CombinedLogger::init(loggers)
            .map_err(|e| format!("Failed to initialize combined logger: {}", e))?;
        
        log::info!("Enhanced logging system initialized with session ID: {}", self.session_id);
        Ok(())
    }
    
    fn rotate_log_if_needed(&self, log_file: &PathBuf) -> Result<(), String> {
        if !log_file.exists() {
            return Ok(());
        }
        
        let metadata = fs::metadata(log_file)
            .map_err(|e| format!("Failed to get log file metadata: {}", e))?;
        
        if metadata.len() > self.max_log_size {
            log::info!("Rotating log file: {}", log_file.display());
            
            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            let backup_name = format!("{}.{}.bak", 
                log_file.file_name().unwrap().to_string_lossy(), 
                timestamp);
            let backup_path = log_file.parent().unwrap().join(backup_name);
            
            fs::rename(log_file, &backup_path)
                .map_err(|e| format!("Failed to rotate log file: {}", e))?;
            
            self.cleanup_old_log_backups(log_file.parent().unwrap())?;
        }
        
        Ok(())
    }
    
    fn cleanup_old_log_backups(&self, log_dir: &std::path::Path) -> Result<(), String> {
        let cutoff_time = std::time::SystemTime::now() - Duration::from_secs(7 * 24 * 60 * 60);
        
        match fs::read_dir(log_dir) {
            Ok(entries) => {
                for entry in entries.filter_map(|e| e.ok()) {
                    let file_name = entry.file_name();
                    let file_name_str = file_name.to_string_lossy();
                    
                    if file_name_str.ends_with(".bak") {
                        if let Ok(metadata) = entry.metadata() {
                            if let Ok(modified) = metadata.modified() {
                                if modified < cutoff_time {
                                    if let Err(e) = fs::remove_file(entry.path()) {
                                        log::warn!("Failed to remove old log backup {}: {}", 
                                            entry.path().display(), e);
                                    } else {
                                        log::debug!("Removed old log backup: {}", entry.path().display());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to read log directory for cleanup: {}", e);
            }
        }
        
        Ok(())
    }
    
    fn log_structured(&self, level: &str, component: &str, message: &str, context: Option<serde_json::Value>) {
        let log_entry = LogEntry {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_string(),
            component: component.to_string(),
            message: message.to_string(),
            context,
            session_id: self.session_id.clone(),
        };
        
        {
            let mut buffer = self.log_buffer.lock().unwrap();
            buffer.push(log_entry.clone());
            if buffer.len() > 1000 {
                buffer.remove(0);
            }
        }
        
        if let Err(e) = self.write_structured_log(&log_entry) {
            log::warn!("Failed to write structured log: {}", e);
        }
    }
    
    fn write_structured_log(&self, entry: &LogEntry) -> Result<(), String> {
        let structured_log_file = self.log_dir.join("structured.jsonl");
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&structured_log_file)
            .map_err(|e| format!("Failed to open structured log file: {}", e))?;
        
        let json_line = serde_json::to_string(entry)
            .map_err(|e| format!("Failed to serialize log entry: {}", e))?;
        
        writeln!(file, "{}", json_line)
            .map_err(|e| format!("Failed to write to structured log file: {}", e))?;
        
        Ok(())
    }
    
    fn add_error_to_history(&self, error_info: ErrorRecoveryInfo) {
        let mut history = self.error_history.lock().unwrap();
        history.push(error_info);
        
        if history.len() > 100 {
            history.remove(0);
        }
    }
    
    fn collect_diagnostic_info(&self, app_handle: &AppHandle) -> Result<DiagnosticInfo, String> {
        let system_info = self.collect_system_info()?;
        let application_info = self.collect_application_info(app_handle)?;
        let backend_info = self.collect_backend_info(app_handle)?;
        
        let recent_logs = {
            let buffer = self.log_buffer.lock().unwrap();
            buffer.iter().rev().take(50).cloned().collect()
        };
        
        let error_history = {
            let history = self.error_history.lock().unwrap();
            history.clone()
        };
        
        Ok(DiagnosticInfo {
            system_info,
            application_info,
            backend_info,
            recent_logs,
            error_history,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }
    
    fn collect_system_info(&self) -> Result<SystemInfo, String> {
        let os = std::env::consts::OS.to_string();
        let arch = std::env::consts::ARCH.to_string();
        
        let java_version = match std::process::Command::new("java").arg("-version").output() {
            Ok(output) => {
                let version_output = String::from_utf8_lossy(&output.stderr);
                Some(version_output.lines().next().unwrap_or("Unknown").to_string())
            }
            Err(_) => None,
        };
        
        // Simplified system info
        let available_memory = 8 * 1024 * 1024 * 1024;
        let disk_space = 1024 * 1024 * 1024;
        let network_connectivity = true;
        
        Ok(SystemInfo {
            os,
            arch,
            java_version,
            available_memory,
            disk_space,
            network_connectivity,
        })
    }
    
    fn collect_application_info(&self, app_handle: &AppHandle) -> Result<ApplicationInfo, String> {
        let data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data directory: {}", e))?;
        
        Ok(ApplicationInfo {
            version: "0.1.0".to_string(),
            build_date: "2024-01-01".to_string(),
            data_directory: data_dir.display().to_string(),
            log_directory: self.log_dir.display().to_string(),
            uptime_seconds: 0,
            session_id: self.session_id.clone(),
        })
    }
    
    fn collect_backend_info(&self, app_handle: &AppHandle) -> Result<BackendInfo, String> {
        let state = app_handle.state::<AppState>();
        let status = state.backend_status.lock().unwrap();
        let status_str = format!("{:?}", *status);
        
        let (process_id, uptime_seconds) = {
            let process_guard = state.backend_process.lock().unwrap();
            if let Some(ref process) = *process_guard {
                (Some(process.pid), Some(process.started_at.elapsed().as_secs()))
            } else {
                (None, None)
            }
        };
        
        let config_guard = state.backend_config.lock().unwrap();
        let port = config_guard.as_ref().map(|c| c.port).unwrap_or(8082);
        
        Ok(BackendInfo {
            status: status_str,
            port,
            process_id,
            uptime_seconds,
            restart_count: 0,
            last_health_check: chrono::Utc::now().to_rfc3339(),
            database_status: None,
        })
    }
}

fn verify_java() -> Result<PathBuf, String> {
    let java_path = which("java").map_err(|_| {
        "Java Runtime Environment (JRE) not found. Please install Java 17 or higher from https://adoptium.net/".to_string()
    })?;
    
    match std::process::Command::new(&java_path)
        .arg("-version")
        .output()
    {
        Ok(output) => {
            let version_output = String::from_utf8_lossy(&output.stderr);
            log::info!("Java version check: {}", version_output);
            
            if version_output.contains("1.8") || version_output.contains("1.7") {
                return Err("Java version is too old. Please install Java 17 or higher.".to_string());
            }
            
            log::info!("Java validation successful: {}", java_path.display());
            Ok(java_path)
        }
        Err(e) => {
            Err(format!("Failed to verify Java installation: {}", e))
        }
    }
}

fn resolve_backend_jar(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // 1. Development: relative to current directory (most common case)
    if let Ok(current_dir) = std::env::current_dir() {
        let jar_path = current_dir.join("frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar");
        if jar_path.exists() {
            log::info!("Found backend JAR at: {}", jar_path.display());
            // Normalize the path to avoid Windows UNC prefix issues
            return Ok(jar_path.canonicalize().unwrap_or(jar_path));
        }
    }
    
    // 2. Alternative: check in parent directory
    if let Ok(current_dir) = std::env::current_dir() {
        let jar_path = current_dir.join("src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar");
        if jar_path.exists() {
            log::info!("Found backend JAR at: {}", jar_path.display());
            return Ok(jar_path.canonicalize().unwrap_or(jar_path));
        }
    }
    
    // 3. Production: Tauri resource bundle
    if let Ok(jar_path) = app_handle.path().resolve("backend/cession-app-backend-0.0.1-SNAPSHOT.jar", tauri::path::BaseDirectory::Resource) {
        if jar_path.exists() {
            log::info!("Found backend JAR at: {}", jar_path.display());
            return Ok(jar_path);
        }
    }
    
    // 4. Check in target directory (build output)
    if let Ok(current_dir) = std::env::current_dir() {
        let jar_path = current_dir.join("frontend/src-tauri/target/debug/backend/cession-app-backend-0.0.1-SNAPSHOT.jar");
        if jar_path.exists() {
            log::info!("Found backend JAR at: {}", jar_path.display());
            return Ok(jar_path.canonicalize().unwrap_or(jar_path));
        }
    }
    
    Err("Backend JAR file not found in any expected location. Please ensure the application is built correctly.".to_string())
}

fn create_backend_config(app_handle: &AppHandle) -> Result<BackendConfig, String> {
    let java_path = verify_java()?;
    let jar_path = resolve_backend_jar(app_handle)?;
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    setup_data_directories(&data_dir)?;

    Ok(BackendConfig {
        jar_path,
        java_path,
        data_dir,
        port: 8082,
        startup_timeout: Duration::from_secs(60),
        health_check_interval: Duration::from_secs(10),
        max_restart_attempts: 3,
    })
}

fn setup_data_directories(data_dir: &PathBuf) -> Result<(), String> {
    log::info!("Setting up data directories at: {}", data_dir.display());
    
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;
    
    let subdirs = vec!["data", "logs", "backups", "temp", "uploads"];
    
    for subdir in subdirs {
        let subdir_path = data_dir.join(subdir);
        std::fs::create_dir_all(&subdir_path)
            .map_err(|e| format!("Failed to create {} directory: {}", subdir, e))?;
        log::debug!("Created directory: {}", subdir_path.display());
    }
    
    validate_data_directory_permissions(&data_dir)?;
    migrate_database_if_needed(&data_dir)?;
    cleanup_temporary_files(&data_dir)?;
    
    log::info!("Data directory setup completed successfully");
    Ok(())
}

fn validate_data_directory_permissions(data_dir: &PathBuf) -> Result<(), String> {
    let test_file = data_dir.join("temp").join(".write_test");
    
    match std::fs::write(&test_file, "test") {
        Ok(()) => {
            let _ = std::fs::remove_file(&test_file);
            log::debug!("Data directory write permissions validated");
            Ok(())
        }
        Err(e) => {
            Err(format!("Data directory is not writable: {}. Please check permissions for: {}", 
                e, data_dir.display()))
        }
    }
}

fn migrate_database_if_needed(data_dir: &PathBuf) -> Result<(), String> {
    let db_dir = data_dir.join("data");
    let db_file = db_dir.join("db.mv.db");
    let old_db_file = data_dir.join("db.mv.db");
    
    if old_db_file.exists() && !db_file.exists() {
        log::info!("Migrating database from old location to new structure");
        
        let backup_file = data_dir.join("backups").join(format!("db_migration_backup_{}.mv.db", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S")));
        
        std::fs::copy(&old_db_file, &backup_file)
            .map_err(|e| format!("Failed to create migration backup: {}", e))?;
        
        std::fs::rename(&old_db_file, &db_file)
            .map_err(|e| format!("Failed to migrate database: {}", e))?;
        
        let old_trace_file = data_dir.join("db.trace.db");
        if old_trace_file.exists() {
            let new_trace_file = db_dir.join("db.trace.db");
            let _ = std::fs::rename(&old_trace_file, &new_trace_file);
        }
        
        log::info!("Database migration completed successfully");
    }
    
    create_periodic_backup(&data_dir)?;
    
    Ok(())
}

fn create_periodic_backup(data_dir: &PathBuf) -> Result<(), String> {
    let db_file = data_dir.join("data").join("db.mv.db");
    let backups_dir = data_dir.join("backups");
    
    if !db_file.exists() {
        return Ok(());
    }
    
    let today = chrono::Utc::now().format("%Y%m%d").to_string();
    
    let existing_backup = std::fs::read_dir(&backups_dir)
        .map_err(|e| format!("Failed to read backups directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .any(|entry| {
            entry.file_name()
                .to_string_lossy()
                .starts_with(&format!("db_backup_{}", today))
        });
    
    if !existing_backup {
        let backup_file = backups_dir.join(format!("db_backup_{}_{}.mv.db", 
            today, chrono::Utc::now().format("%H%M%S")));
        
        match std::fs::copy(&db_file, &backup_file) {
            Ok(_) => log::info!("Created database backup: {}", backup_file.display()),
            Err(e) => log::warn!("Failed to create database backup: {}", e),
        }
    }
    
    cleanup_old_backups(&backups_dir)?;
    
    Ok(())
}

fn cleanup_old_backups(backups_dir: &PathBuf) -> Result<(), String> {
    let cutoff_date = chrono::Utc::now() - chrono::Duration::days(7);
    
    match std::fs::read_dir(backups_dir) {
        Ok(entries) => {
            for entry in entries.filter_map(|e| e.ok()) {
                let file_name = entry.file_name();
                let file_name_str = file_name.to_string_lossy();
                
                if file_name_str.starts_with("db_backup_") && file_name_str.ends_with(".mv.db") {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            let modified_datetime = chrono::DateTime::<chrono::Utc>::from(modified);
                            if modified_datetime < cutoff_date {
                                if let Err(e) = std::fs::remove_file(entry.path()) {
                                    log::warn!("Failed to remove old backup {}: {}", 
                                        entry.path().display(), e);
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => log::warn!("Failed to read backups directory for cleanup: {}", e),
    }
    
    Ok(())
}

fn cleanup_temporary_files(data_dir: &PathBuf) -> Result<(), String> {
    let temp_dir = data_dir.join("temp");
    let cutoff_time = std::time::SystemTime::now() - Duration::from_secs(24 * 60 * 60);
    
    match std::fs::read_dir(&temp_dir) {
        Ok(entries) => {
            for entry in entries.filter_map(|e| e.ok()) {
                let file_name = entry.file_name();
                let file_name_str = file_name.to_string_lossy();
                if file_name_str.starts_with('.') {
                    continue;
                }
                
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if modified < cutoff_time {
                            let path = entry.path();
                            let result = if metadata.is_dir() {
                                std::fs::remove_dir_all(&path)
                            } else {
                                std::fs::remove_file(&path)
                            };
                            
                            match result {
                                Ok(()) => log::debug!("Cleaned up temporary file/directory: {}", path.display()),
                                Err(e) => log::warn!("Failed to clean up {}: {}", path.display(), e),
                            }
                        }
                    }
                }
            }
        }
        Err(e) => log::debug!("No temporary files to clean up: {}", e),
    }
    
    Ok(())
}

// Error Recovery System Implementation
impl ErrorRecoverySystem {
    fn new() -> Self {
        let mut recovery_strategies = std::collections::HashMap::new();
        
        recovery_strategies.insert(
            "java_not_found".to_string(),
            RecoveryAction::ShowInstallDialog("https://adoptium.net/temurin/releases/".to_string())
        );
        recovery_strategies.insert(
            "jar_not_found".to_string(),
            RecoveryAction::ExtractFromResources
        );
        recovery_strategies.insert(
            "port_conflict".to_string(),
            RecoveryAction::TryAlternatePorts(vec![8083, 8084, 8085, 8086])
        );
        recovery_strategies.insert(
            "process_crash".to_string(),
            RecoveryAction::RestartWithDelay(5)
        );
        recovery_strategies.insert(
            "database_error".to_string(),
            RecoveryAction::RepairDatabase
        );
        recovery_strategies.insert(
            "permission_denied".to_string(),
            RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/troubleshooting/permissions".to_string())
        );
        
        Self {
            max_retry_attempts: 3,
            retry_delays: vec![
                Duration::from_secs(1),
                Duration::from_secs(3),
                Duration::from_secs(5),
                Duration::from_secs(10),
            ],
            fallback_ports: vec![8083, 8084, 8085, 8086, 8087],
            recovery_strategies,
        }
    }
    
    fn analyze_error(&self, error: &str) -> ErrorRecoveryInfo {
        let (error_type, user_message, recovery_actions, severity) = if error.contains("Java Runtime Environment") || error.contains("java") {
            (
                "java_not_found".to_string(),
                "Java is required to run this application. Please install Java 17 or higher.".to_string(),
                vec![
                    RecoveryAction::ShowInstallDialog("https://adoptium.net/temurin/releases/".to_string()),
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/java-install".to_string()),
                ],
                ErrorSeverity::Critical,
            )
        } else if error.contains("JAR file not found") || error.contains("jar") {
            (
                "jar_not_found".to_string(),
                "Application files are missing or corrupted. The application will attempt to repair itself.".to_string(),
                vec![
                    RecoveryAction::ExtractFromResources,
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/reinstall".to_string()),
                    RecoveryAction::ContactSupport("support@example.com".to_string()),
                ],
                ErrorSeverity::High,
            )
        } else if error.contains("Port") && error.contains("already in use") {
            (
                "port_conflict".to_string(),
                "Another application is using the required network port. The application will try alternative ports.".to_string(),
                vec![
                    RecoveryAction::TryAlternatePorts(vec![8083, 8084, 8085, 8086]),
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/port-conflicts".to_string()),
                ],
                ErrorSeverity::Medium,
            )
        } else if error.contains("Permission denied") {
            (
                "permission_denied".to_string(),
                "The application doesn't have the necessary permissions. Please run as administrator or check file permissions.".to_string(),
                vec![
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/permissions".to_string()),
                    RecoveryAction::ContactSupport("support@example.com".to_string()),
                ],
                ErrorSeverity::High,
            )
        } else if error.contains("database") || error.contains("Database") {
            (
                "database_error".to_string(),
                "Database connection failed. The application will attempt to repair the database.".to_string(),
                vec![
                    RecoveryAction::RepairDatabase,
                    RecoveryAction::ClearCache,
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/database-issues".to_string()),
                ],
                ErrorSeverity::Medium,
            )
        } else if error.contains("timeout") || error.contains("Timeout") {
            (
                "connection_timeout".to_string(),
                "Connection timeout occurred. The application will retry automatically.".to_string(),
                vec![
                    RecoveryAction::RestartWithDelay(3),
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/connection-issues".to_string()),
                ],
                ErrorSeverity::Low,
            )
        } else {
            (
                "unknown_error".to_string(),
                "An unexpected error occurred. Please try restarting the application.".to_string(),
                vec![
                    RecoveryAction::RestartWithDelay(5),
                    RecoveryAction::ShowTroubleshootingGuide("https://docs.example.com/general-troubleshooting".to_string()),
                    RecoveryAction::ContactSupport("support@example.com".to_string()),
                ],
                ErrorSeverity::Medium,
            )
        };
        
        ErrorRecoveryInfo {
            error_type,
            error_message: error.to_string(),
            user_message,
            recovery_actions,
            technical_details: Some(error.to_string()),
            timestamp: chrono::Utc::now().to_rfc3339(),
            severity,
        }
    }
    
    async fn attempt_recovery(&self, recovery_action: &RecoveryAction, app_handle: &AppHandle) -> Result<String, String> {
        match recovery_action {
            RecoveryAction::RestartWithDelay(delay_seconds) => {
                log::info!("Attempting recovery: restart with delay of {} seconds", delay_seconds);
                tokio::time::sleep(Duration::from_secs(*delay_seconds)).await;
                
                let state = app_handle.state::<AppState>();
                let config_guard = state.backend_config.lock().unwrap();
                let config = config_guard.as_ref().ok_or("Backend configuration not available")?;
                let mut process_guard = state.backend_process.lock().unwrap();
                
                restart_backend_process(app_handle, config, &mut process_guard)?;
                Ok("Backend restarted successfully".to_string())
            }
            RecoveryAction::TryAlternatePorts(ports) => {
                log::info!("Attempting recovery: trying alternate ports {:?}", ports);
                
                let state = app_handle.state::<AppState>();
                let mut config_guard = state.backend_config.lock().unwrap();
                let config = config_guard.as_mut().ok_or("Backend configuration not available")?;
                
                for &port in ports {
                    if !is_port_in_use(port) {
                        log::info!("Found available port: {}", port);
                        config.port = port;
                        
                        let mut process_guard = state.backend_process.lock().unwrap();
                        match restart_backend_process(app_handle, config, &mut process_guard) {
                            Ok(()) => return Ok(format!("Backend restarted on port {}", port)),
                            Err(e) => log::warn!("Failed to start on port {}: {}", port, e),
                        }
                    }
                }
                
                Err("No available ports found".to_string())
            }
            RecoveryAction::RepairDatabase => {
                log::info!("Attempting recovery: repair database");
                
                let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
                let db_file = data_dir.join("data").join("db.mv.db");
                let corrupted_db_backup = data_dir.join("backups").join(format!("db_corrupted_backup_{}.mv.db", 
                    chrono::Utc::now().format("%Y%m%d_%H%M%S")));
                
                if db_file.exists() {
                    std::fs::copy(&db_file, &corrupted_db_backup)
                        .map_err(|e| format!("Failed to backup corrupted database: {}", e))?;
                    
                    std::fs::remove_file(&db_file)
                        .map_err(|e| format!("Failed to remove corrupted database: {}", e))?;
                }
                
                Ok("Database repaired - fresh database will be created".to_string())
            }
            RecoveryAction::ClearCache => {
                log::info!("Attempting recovery: clear cache");
                
                let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
                cleanup_temporary_files(&data_dir)?;
                
                Ok("Cache cleared successfully".to_string())
            }
            RecoveryAction::ExtractFromResources => {
                log::info!("Attempting recovery: extract JAR from resources");
                
                match resolve_backend_jar(app_handle) {
                    Ok(jar_path) => Ok(format!("JAR file located at: {}", jar_path.display())),
                    Err(e) => Err(format!("Failed to locate JAR file: {}", e)),
                }
            }
            _ => Ok("Recovery action requires user interaction".to_string()),
        }
    }
}

// Enhanced error handling with automatic recovery
async fn handle_error_with_recovery(
    error: String,
    app_handle: &AppHandle,
    recovery_system: &ErrorRecoverySystem,
) -> ErrorRecoveryInfo {
    let recovery_info = recovery_system.analyze_error(&error);
    
    log::error!("Error occurred: {} (severity: {:?})", error, recovery_info.severity);
    
    let _ = app_handle.emit("error-occurred", serde_json::json!({
        "error_info": recovery_info,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }));
    
    for recovery_action in &recovery_info.recovery_actions {
        match recovery_action {
            RecoveryAction::RestartWithDelay(_) |
            RecoveryAction::TryAlternatePorts(_) |
            RecoveryAction::RepairDatabase |
            RecoveryAction::ClearCache |
            RecoveryAction::ExtractFromResources => {
                log::info!("Attempting automatic recovery: {:?}", recovery_action);
                
                match recovery_system.attempt_recovery(recovery_action, app_handle).await {
                    Ok(result) => {
                        log::info!("Automatic recovery successful: {}", result);
                        let _ = app_handle.emit("recovery-successful", serde_json::json!({
                            "recovery_action": format!("{:?}", recovery_action),
                            "result": result,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        }));
                        break;
                    }
                    Err(recovery_error) => {
                        log::warn!("Automatic recovery failed: {}", recovery_error);
                        let _ = app_handle.emit("recovery-failed", serde_json::json!({
                            "recovery_action": format!("{:?}", recovery_action),
                            "error": recovery_error,
                            "timestamp": chrono::Utc::now().to_rfc3339()
                        }));
                    }
                }
            }
            _ => log::info!("Recovery action {:?} requires user interaction", recovery_action),
        }
    }
    
    recovery_info
}

fn launch_backend_process(config: &BackendConfig) -> Result<BackendProcess, String> {
    log::info!("Starting backend process...");
    log::info!("  java: {}", config.java_path.display());
    log::info!("  jar: {}", config.jar_path.display());
    log::info!("  data_dir: {}", config.data_dir.display());
    log::info!("  port: {}", config.port);

    if !config.jar_path.exists() {
        return Err(format!("Backend JAR file not found: {}", config.jar_path.display()));
    }

    if let Ok(metadata) = std::fs::metadata(&config.jar_path) {
        log::info!("  jar_size: {} bytes", metadata.len());
        if metadata.len() < 1024 * 1024 {
            log::warn!("JAR file seems unusually small: {} bytes", metadata.len());
        }
    }

    if is_port_in_use(config.port) {
        return Err(format!("Port {} is already in use. Please close any other applications using this port.", config.port));
    }

    // Normalize the JAR path to avoid Windows UNC prefix issues
    let jar_path_str = config.jar_path.to_string_lossy().to_string();
    let normalized_jar_path = if jar_path_str.starts_with("\\\\?\\") {
        jar_path_str.strip_prefix("\\\\?\\").unwrap_or(&jar_path_str).to_string()
    } else {
        jar_path_str
    };
    
    log::info!("  normalized_jar: {}", normalized_jar_path);

    let mut cmd = Command::new(&config.java_path);
    
    cmd.arg("-Xmx512m")
        .arg("-Xms256m")
        .arg("-XX:+UseG1GC")
        .arg("-Dfile.encoding=UTF-8")
        .arg("-Djava.awt.headless=true")
        .arg("-jar")
        .arg(&normalized_jar_path);

    cmd.arg(format!("--server.port={}", config.port))
        .arg("--server.address=127.0.0.1")
        .arg("--logging.level.root=WARN")
        .arg("--logging.level.com.example=INFO")
        .arg("--spring.profiles.active=desktop")
        .arg("--spring.jpa.hibernate.ddl-auto=update")
        .arg("--spring.datasource.url=jdbc:h2:file:./data/db;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
        .arg("--spring.h2.console.enabled=false")
        .arg("--management.endpoints.web.exposure.include=health,info,shutdown")
        .arg("--management.endpoint.shutdown.enabled=true")
        .arg("--management.endpoint.health.show-details=always")
        .arg("--logging.file.name=./logs/backend.log")
        .arg("--spring.servlet.multipart.location=./temp")
        .arg("--app.upload.dir=./uploads")
        .arg("--app.backup.dir=./backups");

    cmd.current_dir(&config.data_dir)
        .env("SPRING_PROFILES_ACTIVE", "desktop")
        .env("JAVA_OPTS", "-Xmx512m -Xms256m")
        .env("SERVER_PORT", config.port.to_string())
        .env("LOGGING_LEVEL_ROOT", "WARN")
        .env("SPRING_JPA_HIBERNATE_DDL_AUTO", "update")
        .env("SPRING_DATASOURCE_URL", "jdbc:h2:file:./data/db;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Hide console window for Java process on Windows
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    log::info!("Executing command: {:?}", cmd);
    log::info!("Working directory: {}", config.data_dir.display());
    
    let child = cmd.spawn()
        .map_err(|e| {
            log::error!("Failed to spawn backend process: {}", e);
            match e.kind() {
                std::io::ErrorKind::NotFound => "Java executable not found. Please ensure Java is installed and in your PATH.".to_string(),
                std::io::ErrorKind::PermissionDenied => "Permission denied when starting backend. Please check file permissions.".to_string(),
                _ => format!("Failed to start backend process: {}", e)
            }
        })?;

    let pid = child.id();
    log::info!("Backend process started with PID: {}", pid);

    Ok(BackendProcess {
        child,
        pid,
        started_at: Instant::now(),
        last_health_check: Instant::now(),
        consecutive_failures: 0,
        restart_attempts: 0,
    })
}

fn is_port_in_use(port: u16) -> bool {
    use std::net::{TcpListener, SocketAddr};
    
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpListener::bind(addr).is_err()
}

fn cleanup_port_processes(port: u16) {
    log::info!("Cleaning up processes using port {}", port);
    
    #[cfg(windows)]
    {
        // Find and kill processes using the port
        let netstat_cmd = std::process::Command::new("netstat")
            .args(["-ano"])
            .output();
        
        if let Ok(output) = netstat_cmd {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if line.contains(&format!(":{}", port)) && line.contains("LISTENING") {
                    // Extract PID from the line (last column)
                    if let Some(pid_str) = line.split_whitespace().last() {
                        if let Ok(pid) = pid_str.parse::<u32>() {
                            log::info!("Found process {} using port {}, terminating it", pid, port);
                            let _ = std::process::Command::new("taskkill")
                                .args(["/F", "/PID", &pid.to_string()])
                                .output();
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(unix)]
    {
        // Use lsof to find processes using the port
        let lsof_cmd = std::process::Command::new("lsof")
            .args(["-ti", &format!(":{}", port)])
            .output();
        
        if let Ok(output) = lsof_cmd {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if let Ok(pid) = line.trim().parse::<u32>() {
                    log::info!("Found process {} using port {}, terminating it", pid, port);
                    let _ = std::process::Command::new("kill")
                        .args(["-15", &pid.to_string()])
                        .output();
                }
            }
        }
    }
    
    // Wait a moment for processes to terminate
    std::thread::sleep(std::time::Duration::from_millis(500));
}

async fn check_backend_health_detailed(port: u16) -> Result<HealthResponse, HealthCheckError> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| HealthCheckError::NetworkError(format!("Failed to create HTTP client: {}", e)))?;

    let endpoints = vec![
        format!("http://localhost:{}/actuator/health", port),
        format!("http://localhost:{}/api/v1/auth/health", port),
        format!("http://localhost:{}/api/health/db", port),
    ];

    let mut last_error = HealthCheckError::UnknownError("No endpoints tried".to_string());
    
    for endpoint in endpoints {
        match client.get(&endpoint).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<HealthResponse>().await {
                        Ok(health_response) => {
                            log::debug!("Detailed health check successful: {}", endpoint);
                            return Ok(health_response);
                        }
                        Err(_) => {
                            log::debug!("Simple health check successful: {}", endpoint);
                            return Ok(HealthResponse {
                                status: "UP".to_string(),
                                database: DatabaseStatus {
                                    connected: true,
                                    url: "jdbc:h2:file:./data/db".to_string(),
                                    error: None,
                                },
                                timestamp: chrono::Utc::now().to_rfc3339(),
                                uptime: 0,
                            });
                        }
                    }
                } else {
                    last_error = HealthCheckError::InvalidResponse(
                        format!("Health endpoint returned status: {}", response.status())
                    );
                    log::debug!("Health check failed for {}: HTTP {}", endpoint, response.status());
                }
            }
            Err(e) => {
                if e.is_timeout() {
                    last_error = HealthCheckError::TimeoutError;
                } else if e.is_connect() {
                    last_error = HealthCheckError::NetworkError(format!("Connection failed: {}", e));
                } else {
                    last_error = HealthCheckError::NetworkError(format!("Request failed: {}", e));
                }
                log::debug!("Health check error for {}: {}", endpoint, e);
            }
        }
    }

    Err(last_error)
}

async fn check_backend_health_internal(port: u16) -> Result<(), String> {
    match check_backend_health_detailed(port).await {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("{:?}", e)),
    }
}

async fn perform_health_check_with_backoff(
    port: u16,
    max_attempts: u32,
    base_delay: Duration,
) -> Result<HealthResponse, HealthCheckError> {
    let mut attempt = 0;
    let mut delay = base_delay;
    
    while attempt < max_attempts {
        match check_backend_health_detailed(port).await {
            Ok(response) => {
                log::debug!("Health check succeeded on attempt {}", attempt + 1);
                return Ok(response);
            }
            Err(e) => {
                attempt += 1;
                if attempt >= max_attempts {
                    log::warn!("Health check failed after {} attempts: {:?}", max_attempts, e);
                    return Err(e);
                }
                
                log::debug!("Health check attempt {} failed, retrying in {:?}: {:?}", 
                    attempt, delay, e);
                
                tokio::time::sleep(delay).await;
                
                delay = std::cmp::min(
                    delay * 2,
                    Duration::from_secs(30)
                );
            }
        }
    }
    
    Err(HealthCheckError::UnknownError("Max attempts reached".to_string()))
}

async fn monitor_backend_process(
    app_handle: AppHandle,
    backend_status: Arc<Mutex<BackendStatus>>,
) {
    let state = app_handle.state::<AppState>();
    let config = {
        let guard = state.backend_config.lock().unwrap();
        guard.as_ref().cloned().expect("Backend config not available")
    };
    let port = config.port;

    let mut regular_check_interval = tokio::time::interval(config.health_check_interval);
    let mut startup_check_interval = tokio::time::interval(Duration::from_secs(5));
    let startup_deadline = Instant::now() + config.startup_timeout;
    let mut backend_ready = false;
    let mut consecutive_failures = 0u32;
    let process_start_time = Instant::now();

    log::info!("Starting backend health monitoring for port {}", port);

    loop {
        tokio::select! {
            _ = regular_check_interval.tick() => {
                if backend_ready {
                    let max_attempts = if consecutive_failures > 3 { 1 } else { 3 };
                    let base_delay = Duration::from_millis(500);
                    
                    match perform_health_check_with_backoff(port, max_attempts, base_delay).await {
                        Ok(health_response) => {
                            consecutive_failures = 0;
                            let mut status = backend_status.lock().unwrap();
                            
                            if !matches!(*status, BackendStatus::Healthy) {
                                *status = BackendStatus::Healthy;
                                let _ = app_handle.emit("backend-status-changed", serde_json::json!({
                                    "status": "healthy",
                                    "timestamp": chrono::Utc::now().to_rfc3339(),
                                    "uptime": process_start_time.elapsed().as_secs(),
                                    "database_connected": health_response.database.connected
                                }));
                                log::info!("Backend health restored");
                            }
                            
                            let _ = app_handle.emit("backend-health-update", serde_json::json!({
                                "health_response": health_response,
                                "consecutive_failures": consecutive_failures,
                                "uptime": process_start_time.elapsed().as_secs()
                            }));
                        }
                        Err(e) => {
                            consecutive_failures += 1;
                            let mut status = backend_status.lock().unwrap();
                            
                            let new_status = match e {
                                HealthCheckError::TimeoutError => BackendStatus::ConnectionTimeout,
                                HealthCheckError::NetworkError(_) => BackendStatus::Unhealthy(format!("{:?}", e)),
                                HealthCheckError::ProcessNotRunning => BackendStatus::ProcessDead,
                                HealthCheckError::DatabaseConnectionFailed(_) => BackendStatus::DatabaseDown,
                                _ => BackendStatus::Unhealthy(format!("{:?}", e)),
                            };
                            
                            *status = new_status.clone();
                            
                            let _ = app_handle.emit("backend-status-changed", serde_json::json!({
                                "status": format!("{:?}", new_status),
                                "error": format!("{:?}", e),
                                "consecutive_failures": consecutive_failures,
                                "timestamp": chrono::Utc::now().to_rfc3339()
                            }));
                            
                            log::warn!("Backend health check failed (attempt {}): {:?}", consecutive_failures, e);
                            
                            if consecutive_failures >= 5 {
                                log::error!("Backend has failed {} consecutive health checks, restart may be required", consecutive_failures);
                                *status = BackendStatus::RestartRequired;
                                let _ = app_handle.emit("backend-restart-required", serde_json::json!({
                                    "consecutive_failures": consecutive_failures,
                                    "last_error": format!("{:?}", e)
                                }));
                            }
                        }
                    }
                }
            }
            _ = startup_check_interval.tick() => {
                if !backend_ready && Instant::now() < startup_deadline {
                    match check_backend_health_detailed(port).await {
                        Ok(health_response) => {
                            backend_ready = true;
                            consecutive_failures = 0;
                            let mut status = backend_status.lock().unwrap();
                            *status = BackendStatus::Healthy;
                            
                            let _ = app_handle.emit("backend-ready", serde_json::json!({
                                "message": "Backend is ready",
                                "startup_time": process_start_time.elapsed().as_secs(),
                                "health_response": health_response
                            }));
                            
                            log::info!("Backend startup completed successfully in {}s", process_start_time.elapsed().as_secs());
                        }
                        Err(e) => {
                            let elapsed = process_start_time.elapsed().as_secs();
                            let _ = app_handle.emit("backend-startup-progress", serde_json::json!({
                                "message": format!("Starting backend... ({}s)", elapsed),
                                "elapsed_seconds": elapsed,
                                "max_seconds": 60,
                                "last_error": format!("{:?}", e)
                            }));
                            
                            log::debug!("Backend still starting up ({}s): {:?}", elapsed, e);
                        }
                    }
                } else if !backend_ready {
                    let mut status = backend_status.lock().unwrap();
                    *status = BackendStatus::Unhealthy("Backend failed to start within timeout".to_string());
                    
                    let _ = app_handle.emit("backend-startup-timeout", serde_json::json!({
                        "message": "Backend startup timeout after 60 seconds",
                        "elapsed_seconds": process_start_time.elapsed().as_secs()
                    }));
                    
                    log::error!("Backend startup timeout after 60 seconds");
                    break;
                }
            }
        }
    }
}

fn restart_backend_process(
    app_handle: &AppHandle,
    config: &BackendConfig,
    current_process: &mut Option<BackendProcess>,
) -> Result<(), String> {
    log::info!("Attempting to restart backend process...");

    if let Some(mut process) = current_process.take() {
        log::info!("Terminating existing backend process (PID: {})", process.pid);
        if let Err(e) = process.child.kill() {
            log::warn!("Failed to kill existing process: {}", e);
        }
        if let Err(e) = process.child.wait() {
            log::warn!("Failed to wait for process termination: {}", e);
        }
    }

    std::thread::sleep(Duration::from_secs(2));

    match launch_backend_process(config) {
        Ok(new_process) => {
            log::info!("Backend process restarted successfully (PID: {})", new_process.pid);
            *current_process = Some(new_process);
            let _ = app_handle.emit("backend-restarted", "Backend process restarted");
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to restart backend process: {}", e);
            let _ = app_handle.emit("backend-error", format!("Restart failed: {}", e));
            Err(e)
        }
    }
}

fn main() {
    // Hide console window on Windows
    #[cfg(windows)]
    hide_console_window();

    let backend_status = Arc::new(Mutex::new(BackendStatus::Starting));
    let backend_status_clone = backend_status.clone();

    let _app = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(move |app| {
            let logging_system = match LoggingSystem::new(&app.handle()) {
                Ok(system) => system,
                Err(e) => {
                    #[cfg(debug_assertions)]
                    eprintln!("Failed to initialize logging system: {}", e);
                    return Err(e.into());
                }
            };
            
            if let Err(_e) = logging_system.setup_enhanced_logging() {
                #[cfg(debug_assertions)]
                eprintln!("Failed to setup enhanced logging: {}", _e);
                if let Err(_e) = setup_logging(&app.handle()) {
                    #[cfg(debug_assertions)]
                    eprintln!("Failed to setup basic logging: {}", _e);
                }
            }
            
            app.manage(AppState {
                backend_process: Mutex::new(None),
                backend_config: Mutex::new(None),
                backend_status: backend_status_clone.clone(),
                error_recovery: Mutex::new(ErrorRecoverySystem::new()),
                logging_system: Mutex::new(logging_system),
            });

            match create_backend_config(&app.handle()) {
                Ok(config) => {
                    log::info!("Backend configuration created successfully");
                    
                    // Check if port is available before starting
                    if is_port_in_use(config.port) {
                        log::warn!("Port {} is already in use, attempting cleanup...", config.port);
                        
                        // Try to clean up any existing processes on this port
                        #[cfg(windows)]
                        {
                            let netstat_cmd = std::process::Command::new("netstat")
                                .args(["-ano"])
                                .output();
                            
                            if let Ok(output) = netstat_cmd {
                                let output_str = String::from_utf8_lossy(&output.stdout);
                                for line in output_str.lines() {
                                    if line.contains(&format!(":{}", config.port)) && line.contains("LISTENING") {
                                        if let Some(pid_str) = line.split_whitespace().last() {
                                            if let Ok(pid) = pid_str.parse::<u32>() {
                                                log::info!("Killing existing process {} on port {}", pid, config.port);
                                                let _ = std::process::Command::new("taskkill")
                                                    .args(["/F", "/PID", &pid.to_string()])
                                                    .output();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Wait a moment for cleanup
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        
                        // Check again
                        if is_port_in_use(config.port) {
                            let error_msg = format!("Port {} is still in use after cleanup attempt. Please ensure no other applications are using this port.", config.port);
                            log::error!("{}", error_msg);
                            let mut status = backend_status.lock().unwrap();
                            *status = BackendStatus::PortConflict;
                            let _ = app.emit("backend-error", &error_msg);
                            return Ok(());
                        }
                    }
                    
                    *app.state::<AppState>().backend_config.lock().unwrap() = Some(config.clone());

                    match launch_backend_process(&config) {
                        Ok(mut backend_process) => {
                            log::info!("Backend process launched successfully (PID: {})", backend_process.pid);
                            
                            let stdout = backend_process.child.stdout.take().expect("Failed to capture stdout");
                            let stderr = backend_process.child.stderr.take().expect("Failed to capture stderr");
                            
                            *app.state::<AppState>().backend_process.lock().unwrap() = Some(backend_process);

                            thread::spawn(move || {
                                let reader = BufReader::new(stdout);
                                for line in reader.lines() {
                                    match line {
                                        Ok(line) => log::info!("[Backend] {}", line),
                                        Err(e) => log::error!("[Backend] Error reading stdout: {}", e),
                                    }
                                }
                            });

                            thread::spawn(move || {
                                let reader = BufReader::new(stderr);
                                for line in reader.lines() {
                                    match line {
                                        Ok(line) => {
                                            if line.contains("ERROR") || line.contains("Exception") || line.contains("Failed") {
                                                log::error!("[Backend] {}", line);
                                            } else {
                                                log::info!("[Backend] {}", line);
                                            }
                                        },
                                        Err(e) => log::error!("[Backend] Error reading stderr: {}", e),
                                    }
                                }
                            });

                            // Backend monitoring will be started when requested via start_health_monitoring command

                            let _ = app.emit("backend-starting", "Backend process started");
                        }
                        Err(e) => {
                            log::error!("Failed to launch backend process: {}", e);
                            let mut status = backend_status.lock().unwrap();
                            *status = BackendStatus::Unhealthy(e.clone());
                            
                            let app_handle = app.handle().clone();
                            let error_message = e.clone();
                            tokio::spawn(async move {
                                let state = app_handle.state::<AppState>();
                                let recovery_system = {
                                    let guard = state.error_recovery.lock().unwrap();
                                    guard.clone()
                                };
                                let _recovery_info = handle_error_with_recovery(error_message, &app_handle, &recovery_system).await;
                            });
                            
                            let _ = app.emit("backend-error", &e);
                        }
                    }
                }
                Err(e) => {
                    log::error!("Failed to create backend configuration: {}", e);
                    let mut status = backend_status.lock().unwrap();
                    *status = BackendStatus::Unhealthy(e.clone());
                    let _ = app.emit("backend-error", &e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                log::info!("Window close requested, shutting down backend...");
                
                let state = window.state::<AppState>();
                
                // Get the current port from config
                let port = {
                    let config_guard = state.backend_config.lock().unwrap();
                    config_guard.as_ref().map(|c| c.port).unwrap_or(8082)
                };
                
                // Step 1: Kill the managed process
                {
                    let mut process_guard = state.backend_process.lock().unwrap();
                    if let Some(mut process) = process_guard.take() {
                        log::info!("Killing backend process (PID: {})", process.pid);
                        let _ = process.child.kill();
                        let _ = process.child.wait();
                    }
                }
                
                // Step 2: Clean up any remaining processes on the port
                cleanup_port_processes(port);
                
                log::info!("Backend cleanup completed");
            }
            tauri::WindowEvent::Destroyed => {
                log::info!("Window destroyed");
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            stop_backend_process,
            get_detailed_health_status,
            trigger_health_check,
            start_health_monitoring,
            check_backend_health, 
            wait_for_backend_ready, 
            get_backend_status, 
            restart_backend,
            get_data_directory_info,
            cleanup_data_directory,
            create_database_backup,
            analyze_error,
            attempt_error_recovery,
            get_recovery_suggestions,
            trigger_automatic_recovery,
            get_diagnostic_info,
            get_recent_logs,
            get_error_history,
            export_logs,
            clear_logs,
            log_structured_message,
            updater::check_for_updates,
            updater::download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
