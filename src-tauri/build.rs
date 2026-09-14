fn main() {
    let is_win7_target = std::env::var("CARGO_CFG_TARGET_VENDOR").as_deref() == Ok("win7");
    if is_win7_target && std::env::var_os("CARGO_FEATURE_CUSTOM_PROTOCOL").is_none() {
        panic!("Windows 7 release builds must enable the custom-protocol feature");
    }

    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg=/STACK:16777216");
    }

    // Force rebuild to re-embed frontend assets
    tauri_build::build()
}
