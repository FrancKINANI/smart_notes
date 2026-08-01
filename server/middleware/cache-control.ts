import { Request, Response, NextFunction } from "express";

interface CacheOptions {
  public?: boolean;
  maxAge?: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
  noStore?: boolean;
}

const defaultOptions: CacheOptions = {
  public: false,
  maxAge: 0,
  staleWhileRevalidate: 0,
  mustRevalidate: true,
  noStore: false,
};

export const setCacheControl = (options: CacheOptions = {}) => {
  const finalOptions = { ...defaultOptions, ...options };

  return (_req: Request, res: Response, next: NextFunction) => {
    const directives: string[] = [];

    if (finalOptions.noStore) {
      directives.push("no-store");
    } else {
      // Cache visibility
      directives.push(finalOptions.public ? "public" : "private");

      // Max age
      if (finalOptions.maxAge !== undefined) {
        directives.push(`max-age=${finalOptions.maxAge}`);
      }

      // Stale while revalidate
      if (finalOptions.staleWhileRevalidate) {
        directives.push(
          `stale-while-revalidate=${finalOptions.staleWhileRevalidate}`
        );
      }

      // Must revalidate
      if (finalOptions.mustRevalidate) {
        directives.push("must-revalidate");
      }
    }

    res.setHeader("Cache-Control", directives.join(", "));
    next();
  };
};

// Predefined cache configurations
export const cachePresets = {
  // For static resources that rarely change
  staticAssets: setCacheControl({
    public: true,
    maxAge: 86400, // 1 day
    staleWhileRevalidate: 43200, // 12 hours
  }),

  // For data that changes occasionally
  dynamicContent: setCacheControl({
    public: true,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60, // 1 minute
  }),

  // For user data
  userContent: setCacheControl({
    public: false,
    maxAge: 60, // 1 minute
    mustRevalidate: true,
  }),

  // For sensitive or real-time data
  noCache: setCacheControl({
    noStore: true,
  }),
};

// ETag validation middleware
export const etagMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (body: any): Response {
    // Generate an ETag based on the content
    const etag = require("crypto")
      .createHash("md5")
      .update(JSON.stringify(body))
      .digest("hex");

    // Check if the client has a cached version
    if (req.headers["if-none-match"] === etag) {
      res.status(304).send();
      return res;
    }

    res.setHeader("ETag", etag);
    return originalSend.call(this, body);
  };

  next();
};

// Last-Modified validation middleware
export const lastModifiedMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ifModifiedSince = req.headers["if-modified-since"];
  const lastModified = res.getHeader("Last-Modified");

  if (ifModifiedSince && lastModified) {
    const clientDate = new Date(ifModifiedSince as string);
    const serverDate = new Date(lastModified as string);

    if (clientDate >= serverDate) {
      res.status(304).send();
      return;
    }
  }

  next();
};
