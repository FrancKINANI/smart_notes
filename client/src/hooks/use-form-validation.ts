import { useState, useCallback } from "react";
import { z } from "zod";
import { validationSchemas, type ValidationSchemas } from "@shared/validation";

type ValidationResult<T> = {
  isValid: boolean;
  errors: Record<keyof T, string[]>;
};

export function useFormValidation<K extends keyof ValidationSchemas>() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const validate = useCallback(
    <T extends z.infer<ValidationSchemas[K]>>(
      schema: K,
      data: T
    ): ValidationResult<T> => {
      try {
        validationSchemas[schema].parse(data);
        setErrors({});
        return { isValid: true, errors: {} as Record<keyof T, string[]> };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors: Record<string, string[]> = {};
          error.errors.forEach((err) => {
            const path = err.path[0] as string;
            if (!formattedErrors[path]) {
              formattedErrors[path] = [];
            }
            formattedErrors[path].push(err.message);
          });
          setErrors(formattedErrors);
          return {
            isValid: false,
            errors: formattedErrors as Record<keyof T, string[]>,
          };
        }
        return { isValid: false, errors: {} as Record<keyof T, string[]> };
      }
    },
    []
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return errors[field]?.[0];
    },
    [errors]
  );

  return {
    validate,
    errors,
    clearErrors,
    getFieldError,
  };
}
