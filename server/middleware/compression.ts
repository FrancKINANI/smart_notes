import compression from "compression";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/monitoring";

// Liste des types de contenu à comprimer
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

// Fonction pour déterminer si la requête doit être compressée
const shouldCompress = (req: Request, res: Response) => {
  // Ne pas comprimer pour les anciens navigateurs
  if (req.headers["user-agent"]?.includes("MSIE 6")) {
    return false;
  }

  // Ne pas comprimer les petites réponses
  const threshold = parseInt(process.env.COMPRESSION_THRESHOLD || "2048", 10);
  if (parseInt(res.getHeader("Content-Length") as string, 10) < threshold) {
    return false;
  }

  // Vérifier le type de contenu
  const contentType = res.getHeader("Content-Type") as string;
  if (!contentType) return false;

  return compressibleTypes.some((type) => contentType.includes(type));
};

// Configuration de la compression
const compressionOptions = {
  filter: shouldCompress,
  level: process.env.NODE_ENV === "production" ? 6 : 1, // Niveau de compression plus élevé en production
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD || "2048", 10), // Seuil minimum pour la compression
  windowBits: 15,
  memLevel: 8,
  strategy: 0,
};

// Middleware de compression avec monitoring
export const compressionWithMonitoring = () => {
  const compress = compression(compressionOptions);

  return (req: Request, res: Response, next: NextFunction) => {
    const originalSize = res.getHeader("Content-Length");

    // Intercepter la fin de la réponse pour logger les statistiques de compression
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
