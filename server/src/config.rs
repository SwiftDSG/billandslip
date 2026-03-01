pub struct Config {
    pub host: String,
    pub port: u16,
    pub store_path: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: 8080,
            store_path: "data/store.json".into(),
        }
    }
}
