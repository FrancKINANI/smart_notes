import compression from "compression";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/monitoring";

// List of content types to compress
const compressibleTypes = [
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/json",
  "application/x-javascript",
  "application/xml",
  "application/vnd.api+json",
  "application/ld+json",
];

// Function to determine if the request should be compressed
const shouldCompress = (req: Request, res: Response) => {
  // Do not compress for old browsers
  if (req.headers["user-agent"]?.includes("MSIE 6")) {
    return false;
  }

  // Do not compress small responses
  const threshold = parseInt(process.env.COMPRESSION_THRESHOLD || "2048", 10);
  if (parseInt(res.getHeader("Content-Length") as string, 10) < threshold) {
    return false;
  }

  // Check the content type
  const contentType = res.getHeader("Content-Type") as string;
  if (!contentType) return false;

  return compressibleTypes.some((type) => contentType.includes(type));
};

// Compression configuration
const compressionOptions = {
  filter: shouldCompress,
  level: process.env.NODE_ENV === "production" ? 6 : 1, // Higher compression level in production
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD || "2048", 10), // Minimum threshold for compression
  windowBits: 15,
  memLevel: 8,
  strategy: 0,
};

// Compression middleware with monitoring
export const compressionWithMonitoring = () => {
  const compress = compression(compressionOptions);

  return (req: Request, res: Response, next: NextFunction) => {
    const originalSize = res.getHeader("Content-Length");

    // Intercept the end of the response to log compression statistics
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      const compressedSize = res.getHeader("Content-Length");

      if (originalSize && compressedSize) {
        const saved =
          parseInt(originalSize as string, 10) -
          parseInt(compressedSize as string, 10);
        const ratio =
          saved > 0 ? (saved / parseInt(originalSize as string, 10)) * 100 : 0;

        logger.debug("Compression stats:", {
          path: req.path,
          originalSize,
          compressedSize,
          saved,
          ratio: `${ratio.toFixed(2)}%`,
        });
      }

      return originalEnd.call(this, chunk, encoding, cb);
    };

    compress(req, res, next);
  };
};
