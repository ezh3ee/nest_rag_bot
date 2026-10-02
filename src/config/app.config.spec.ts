import appConfig from './app.config';

const MANAGED_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_CHAT_ID',
  'PORT',
  'QDRANT_URL',
  'QDRANT_API_KEY',
  'QDRANT_COLLECTION',
  'REDIS_HOST',
  'DATABASE_URL',
  'CHAT_LOG_DIR',
  'USE_WIDGET',
  'WIDGET_TOKEN',
  'WIDGET_ALLOWED_ORIGIN',
  'WIDGET_DAILY_LIMIT',
];

const REQUIRED_ENV: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: '123456:TEST-TOKEN',
  ADMIN_CHAT_ID: '110159942',
};

describe('appConfig', () => {
  let savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv = {};
    for (const key of MANAGED_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    Object.assign(process.env, REQUIRED_ENV);
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('parses a minimal environment and applies defaults', () => {
    const config = appConfig();

    expect(config.PORT).toBe(3000);
    expect(config.QDRANT_URL).toBe('http://localhost:6333');
    expect(config.QDRANT_COLLECTION).toBe('rag_minimal');
    expect(config.DATABASE_URL).toBe('file:./dev.db');
    expect(config.CHAT_LOG_DIR).toBe('./logs');
    expect(config.USE_WIDGET).toBe(false);
    expect(config.WIDGET_DAILY_LIMIT).toBe(200);
  });

  it('coerces numeric strings into numbers', () => {
    process.env.PORT = '8080';
    process.env.ADMIN_CHAT_ID = '42';
    process.env.WIDGET_DAILY_LIMIT = '7';

    const config = appConfig();

    expect(config.PORT).toBe(8080);
    expect(config.ADMIN_CHAT_ID).toBe(42);
    expect(config.WIDGET_DAILY_LIMIT).toBe(7);
  });

  it('rejects a missing bot token', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    expect(() => appConfig()).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it('rejects a boolean flag that is not strictly true/false', () => {
    process.env.USE_WIDGET = '1';

    expect(() => appConfig()).toThrow(/Must be strictly 'true' or 'false'/);
  });

  it('rejects USE_WIDGET=true without a widget token', () => {
    process.env.USE_WIDGET = 'true';
    process.env.WIDGET_TOKEN = '';

    expect(() => appConfig()).toThrow(/WIDGET_TOKEN/);
  });

  it('accepts USE_WIDGET=true together with a token', () => {
    process.env.USE_WIDGET = 'true';
    process.env.WIDGET_TOKEN = 'super-secret-token';

    const config = appConfig();

    expect(config.USE_WIDGET).toBe(true);
    expect(config.WIDGET_TOKEN).toBe('super-secret-token');
  });

  it('rejects a malformed allowed origin', () => {
    process.env.WIDGET_ALLOWED_ORIGIN = 'not-a-url';

    expect(() => appConfig()).toThrow(/WIDGET_ALLOWED_ORIGIN/);
  });

  it('accepts an empty allowed origin (widget served same-origin)', () => {
    process.env.WIDGET_ALLOWED_ORIGIN = '';

    const config = appConfig();

    expect(config.WIDGET_ALLOWED_ORIGIN).toBe('');
  });
});
