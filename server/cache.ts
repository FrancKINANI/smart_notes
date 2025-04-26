import NodeCache from "node-cache";

// Configuration du cache avec TTL par défaut de 5 minutes
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 320,
  useClones: false,
});

type CacheKey = string;
type CacheValue = any;

interface CacheOptions {
  ttl?: number;
  key?: string;
}

// Fonction pour générer une clé de cache
const generateCacheKey = (
  prefix: string,
  params: Record<string, any>
): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// Wrapper pour la mise en cache des données
export const withCache = async <T>(
  prefix: string,
  params: Record<string, any>,
  fetchFunction: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> => {
  const cacheKey = options.key || generateCacheKey(prefix, params);
  const cachedData = cache.get<T>(cacheKey);

  if (cachedData !== undefined) {
    return cachedData;
  }

  const freshData = await fetchFunction();
  cache.set(cacheKey, freshData, options.ttl);
  return freshData;
};

// Invalidation du cache par préfixe
export const invalidateCache = (prefix: string): void => {
  const keys = cache.keys();
  const prefixKeys = keys.filter((key) => key.startsWith(`${prefix}:`));
  cache.del(prefixKeys);
};

// Middleware de mise en cache pour Express
export const cacheMiddleware = (prefix: string, ttl?: number) => {
  return async (req: any, res: any, next: any) => {
    const cacheKey = generateCacheKey(prefix, {
      url: req.url,
      query: req.query,
      params: req.params,
      user: req.user?.id,
    });

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const originalJson = res.json;
    res.json = function (data: any) {
      cache.set(cacheKey, data, ttl);
      return originalJson.call(this, data);
    };

    next();
  };
};

// Gestionnaire de cache pour les requêtes vers l'API externe
export const externalApiCache = {
  set: (key: CacheKey, value: CacheValue, ttl?: number) => {
    cache.set(key, value, ttl);
  },

  get: <T>(key: CacheKey): T | undefined => {
    return cache.get<T>(key);
  },

  del: (key: CacheKey) => {
    cache.del(key);
  },

  flush: () => {
    cache.flushAll();
  },

  stats: () => {
    return cache.getStats();
  },
};

export { cache };
