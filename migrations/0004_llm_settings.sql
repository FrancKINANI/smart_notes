-- LLM configuration table (hot cloud/edge switch via /api/admin/llm-settings).
-- The cloud API key is NEVER stored here: it stays in an environment variable.
CREATE TABLE IF NOT EXISTS llm_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'openrouter',
  base_url VARCHAR(500),
  model_name VARCHAR(255),
  qvac_model_src VARCHAR(500),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
