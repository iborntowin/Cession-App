use std::path::Path;
use std::fs;

fn main() {
    // Verify that required resources exist before building
    verify_backend_resources();
    
    tauri_build::build()
}

fn verify_backend_resources() {
    let backend_jar_paths = [
        "backend/cession-app-backend-0.0.1-SNAPSHOT.jar",
        "backend/app.jar",
    ];
    
    let mut found_jar = false;
    
    for jar_path in &backend_jar_paths {
        if Path::new(jar_path).exists() {
            println!("cargo:warning=Found backend JAR: {}", jar_path);
            found_jar = true;
            break;
        }
    }
    
    if !found_jar {
        println!("cargo:warning=No backend JAR found in expected locations:");
        for jar_path in &backend_jar_paths {
            println!("cargo:warning=  - {}", jar_path);
        }
        println!("cargo:warning=Please ensure the backend is built before running Tauri build");
        
        // Try to find JAR in the main backend target directory
        let main_backend_jar = "../backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar";
        if Path::new(main_backend_jar).exists() {
            println!("cargo:warning=Found JAR in main backend directory: {}", main_backend_jar);
            println!("cargo:warning=Consider copying it to src-tauri/backend/ directory");
        }
    }
    
    // Ensure backend directory exists
    if let Err(e) = fs::create_dir_all("backend") {
        println!("cargo:warning=Failed to create backend directory: {}", e);
    }
    
    // Ensure resources/backend directory exists
    if let Err(e) = fs::create_dir_all("resources/backend") {
        println!("cargo:warning=Failed to create resources/backend directory: {}", e);
    }
    
    // Print resource paths for debugging
    println!("cargo:rerun-if-changed=backend/");
    println!("cargo:rerun-if-changed=resources/backend/");
    println!("cargo:rerun-if-changed=../backend/target/");
}
