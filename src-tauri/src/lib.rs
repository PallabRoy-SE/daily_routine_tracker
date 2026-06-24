use std::fs;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
async fn save_remote_db(app: tauri::AppHandle, data: Vec<u8>) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("routine_data_remote.db");
    fs::write(db_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn read_local_db(app: tauri::AppHandle) -> Result<Vec<u8>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("routine_data.db");
    let data = fs::read(db_path).map_err(|e| e.to_string())?;
    Ok(data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    priority INTEGER NOT NULL DEFAULT 1,
                    is_completed INTEGER NOT NULL DEFAULT 0,
                    time_limit INTEGER,
                    links TEXT,
                    updated_at INTEGER NOT NULL,
                    is_deleted INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE task_logs (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    target_date TEXT NOT NULL,
                    is_completed INTEGER NOT NULL DEFAULT 0,
                    updated_at INTEGER NOT NULL,
                    is_deleted INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
                );

                CREATE TABLE user_stats (
                    id TEXT PRIMARY KEY,
                    xp INTEGER NOT NULL DEFAULT 0,
                    current_streak INTEGER NOT NULL DEFAULT 0,
                    max_streak INTEGER NOT NULL DEFAULT 0,
                    last_completed_at TEXT,
                    updated_at INTEGER NOT NULL,
                    is_deleted INTEGER NOT NULL DEFAULT 0
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_scheduled_date_to_tasks",
            sql: "
                ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;
                UPDATE tasks SET scheduled_date = date('now', 'localtime') WHERE scheduled_date IS NULL;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_app_settings_table",
            sql: "
                CREATE TABLE app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:routine_data.db", migrations)
                .build()
        )
        .invoke_handler(tauri::generate_handler![save_remote_db, read_local_db])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
