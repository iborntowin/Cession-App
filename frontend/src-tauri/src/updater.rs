use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use semver::Version;
use sha2::{Sha256, Digest};

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateManifest {
    pub version: String,
    pub notes: String,
    pub pub_date: String,
    pub platforms: Platforms,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Platforms {
    #[serde(rename = "windows-x86_64")]
    pub windows_x86_64: Option<PlatformInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub url: String,
    pub sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum UpdateEvent {
    #[serde(rename = "started")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename = "progress")]
    Progress {
        chunk_length: u64,
    },
    #[serde(rename = "finished")]
    Finished,
    #[serde(rename = "error")]
    Error {
        message: String,
    },
}

#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<Option<UpdateManifest>, String> {
    let current_version = app_handle.package_info().version.to_string();
    let url = "https://github.com/iborntowin/Cession-App/releases/latest/download/latest.json";

    let client = reqwest::Client::builder()
        .user_agent("Cession-App-Updater")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let manifest: UpdateManifest = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch update manifest: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse update manifest: {}", e))?;

    // Parse versions using semver for proper comparison
    let current = Version::parse(&current_version)
        .map_err(|e| format!("Invalid current version '{}': {}", current_version, e))?;
    let remote = Version::parse(&manifest.version)
        .map_err(|e| format!("Invalid remote version '{}': {}", manifest.version, e))?;

    // Compare versions properly
    if remote > current {
        log::info!("Update available: {} -> {}", current, remote);
        Ok(Some(manifest))
    } else {
        log::info!("Already on latest version: {}", current);
        Ok(None)
    }
}

#[tauri::command]
pub async fn download_and_install_update(
    app_handle: AppHandle,
    download_url: String,
    expected_sha256: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("Cession-App-Updater")
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Start download
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let content_length = response.content_length();

    // Emit started event
    app_handle
        .emit("update-download-progress", UpdateEvent::Started { content_length })
        .ok();

    // Create temp directory with unique filename for NSIS .exe installer
    let temp_dir = std::env::temp_dir();
    let unique_id = uuid::Uuid::new_v4();
    let file_name = format!("cession_update_{}.exe", unique_id);
    let file_path = temp_dir.join(&file_name);

    log::info!("Downloading NSIS installer to: {}", file_path.display());

    // Download file with progress
    let mut downloaded: u64 = 0;
    let mut hasher = Sha256::new();
    
    // Scope the file handle to ensure it's dropped before we try to execute
    {
        let mut file = tokio::fs::File::create(&file_path)
            .await
            .map_err(|e| format!("Failed to create file: {}", e))?;

        let mut stream = response.bytes_stream();
        let mut chunk_count = 0;

        use futures_util::StreamExt;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Failed to download chunk: {}", e))?;
            let chunk_len = chunk.len() as u64;
            
            // Update hash
            hasher.update(&chunk);
            
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("Failed to write chunk: {}", e))?;

            downloaded += chunk_len;
            chunk_count += 1;

            // Emit progress event every 10 chunks to reduce overhead
            if chunk_count % 10 == 0 || (content_length.is_some() && downloaded >= content_length.unwrap()) {
                app_handle
                    .emit("update-download-progress", UpdateEvent::Progress { chunk_length: chunk_len })
                    .ok();
            }
        }

        file.flush()
            .await
            .map_err(|e| format!("Failed to flush file: {}", e))?;
        
        // File handle is explicitly dropped here when scope ends
    }

    log::info!("Download completed: {} bytes", downloaded);

    // Emit finished event
    app_handle
        .emit("update-download-progress", UpdateEvent::Finished)
        .ok();

    // CRITICAL: Give Windows time to fully release the file handle
    // Windows Defender and other AV software may scan the file immediately
    log::info!("Waiting for Windows to release file locks...");
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Verify checksum if provided
    if let Some(expected) = expected_sha256 {
        let computed_hash = format!("{:x}", hasher.finalize());
        log::info!("Verifying checksum...");
        log::info!("Expected:  {}", expected);
        log::info!("Computed:  {}", computed_hash);
        
        if computed_hash != expected.to_lowercase() {
            // Clean up downloaded file
            let _ = tokio::fs::remove_file(&file_path).await;
            return Err(format!(
                "Checksum verification failed! Expected: {}, Got: {}. The download may be corrupted or tampered.",
                expected, computed_hash
            ));
        }
        log::info!("Checksum verification passed!");
    } else {
        log::warn!("No checksum provided - skipping verification (not recommended)");
    }

    // Create a copy of the installer to avoid file locking issues
    // Some antivirus/Windows Defender may lock the original file
    log::info!("Creating installer copy to avoid file locks...");
    let installer_copy = temp_dir.join(format!("cession_installer_{}.exe", unique_id));
    
    // Retry copy operation in case of temporary locks
    let mut retry_count = 0;
    let mut backoff_ms = 700u64;
    loop {
        match tokio::fs::copy(&file_path, &installer_copy).await {
            Ok(_) => {
                log::info!("Installer copy created successfully");
                break;
            }
            Err(e) if retry_count < 10 => {
                retry_count += 1;
                log::warn!("Copy failed (attempt {}), retrying in {}ms: {}", retry_count, backoff_ms, e);
                tokio::time::sleep(tokio::time::Duration::from_millis(backoff_ms)).await;
                // exponential backoff within reason
                backoff_ms = std::cmp::min(backoff_ms.saturating_mul(2), 5000);
            }
            Err(e) => {
                log::error!("Failed to copy installer after {} attempts: {}", retry_count, e);
                return Err(format!("Failed to prepare installer: {}. Please close any antivirus scans and try again.", e));
            }
        }
    }

    // Clean up original download
    let _ = tokio::fs::remove_file(&file_path).await;

    // Signal backend to prepare for shutdown
    let _ = app_handle.emit("prepare-for-update", ());
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Use NSIS .exe installer instead of MSI to bypass Smart App Control
    log::info!("Using NSIS .exe installer for better Windows compatibility...");
    
    // Use the copy for installation
    install_nsis_exe(&installer_copy, &app_handle).await?;

    Ok(())
}

async fn install_nsis_exe(exe_path: &PathBuf, _app_handle: &AppHandle) -> Result<(), String> {
    log::info!("Installing NSIS .exe installer: {}", exe_path.display());
    
    // Verify file exists
    if !exe_path.exists() {
        return Err("Installer file not found".to_string());
    }
    
    // Create a batch script to run the installer AFTER this app exits
    // This completely avoids file locking issues
    let temp_dir = std::env::temp_dir();
    let batch_script = temp_dir.join(format!("cession_update_{}.bat", uuid::Uuid::new_v4()));
    
    let installer_path_str = exe_path.to_string_lossy().to_string();
    let app_name = "cession-app-frontend.exe";  // Actual executable name from Tauri build
    let install_dir = std::env::var("PROGRAMFILES")
        .unwrap_or_else(|_| "C:\\Program Files".to_string());
    let app_path = format!("{}\\Cession Management App\\{}", install_dir, app_name);
    
    // Batch script that:
    // 1. Waits 2 seconds for app to fully close
    // 2. Runs the installer silently
    // 3. Waits for installer to finish
    // 4. Launches the new version
    // 5. Cleans up both installer and itself
    let batch_content = format!(
        r#"@echo off
echo Waiting for Cession App to close...
timeout /t 2 /nobreak >nul

echo Running installer...
"{}" /S
if errorlevel 1 (
    echo Installation failed!
    pause
    goto cleanup
)

echo Waiting for installation to complete...
timeout /t 3 /nobreak >nul

echo Launching new version...
start "" "{}"

:cleanup
echo Cleaning up...
del /f /q "{}"
del /f /q "%~f0"
"#,
        installer_path_str,
        app_path,
        installer_path_str
    );
    
    log::info!("Creating launcher batch script: {}", batch_script.display());
    tokio::fs::write(&batch_script, batch_content)
        .await
        .map_err(|e| format!("Failed to create batch script: {}", e))?;
    
    log::info!("Starting installer via batch script...");
    
    // Run the batch script in a detached process
    match std::process::Command::new("cmd")
        .args(&["/c", "start", "/min", batch_script.to_str().unwrap()])
        .spawn()
    {
        Ok(_) => {
            log::info!("Update script launched successfully!");
            log::info!("Exiting current application to complete update...");
            
            // Exit immediately - the batch script will handle everything
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            std::process::exit(0);
        }
        Err(e) => {
            // Clean up on error
            let _ = tokio::fs::remove_file(&batch_script).await;
            let _ = tokio::fs::remove_file(exe_path).await;
            
            Err(format!("Failed to launch update script: {}. Try running as administrator.", e))
        }
    }
}
