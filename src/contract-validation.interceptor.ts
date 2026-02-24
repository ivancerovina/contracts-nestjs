import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { map, Observable } from "rxjs";
import { z } from "zod";
import { ProcessRoute } from "contracts";

export const CONTRACT_METADATA = "CONTRACT_METADATA";

export class ZodValidationException extends Error {
  constructor(
    public readonly issues: Record<string, string>,
    public readonly message: string,
  ) {
    super(message);
  }
}

@Injectable()
export class ContractValidationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const route = this.reflector.get<ProcessRoute<any>>(
      CONTRACT_METADATA,
      context.getHandler(),
    );

    if (!route) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest() as Request;

    // Validate Params
    if (route.params && route.params instanceof z.ZodType) {
      const result = route.params.safeParse(request.params);
      if (!result.success) {
        throw new ZodValidationException(
          this.formatZodIssues(result.error),
          "Invalid URL parameters",
        );
      }
      request.params = result.data as typeof request.params;
    } else if (Object.keys(request.params || {}).length > 0) {
      // Contract expects no params, but params were received
      throw new InternalServerErrorException(
        "Contract expects no params, but params were received",
      );
    }

    // Validate Query
    if (route.query) {
      const result = route.query.safeParse(request.query);
      if (!result.success) {
        throw new ZodValidationException(
          this.formatZodIssues(result.error),
          "Invalid Query Parameters",
        );
      }
      request.query = result.data;
    }

    // Validate Body
    if (route.body) {
      const result = route.body.safeParse(request.body);
      if (!result.success) {
        throw new ZodValidationException(
          this.formatZodIssues(result.error),
          "Invalid Request Body",
        );
      }
      request.body = result.data;
    }

    // Response Validation
    return next.handle().pipe(
      map((data) => {
        if (route.response.data) {
          const result = route.response.data.safeParse(data);
          if (!result.success) {
            console.error(
              "Read Model Validation Error",
              JSON.stringify(result.error, null, 2),
            );
            throw new InternalServerErrorException("Invalid server response");
          }
          return {
            success: true,
            data: result.data,
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }

  private formatZodIssues(error: z.ZodError): Record<string, string> {
    const issues: Record<string, string> = {};
    for (const issue of error.issues) {
      issues[issue.path.join(".")] = issue.message;
    }
    return issues;
  }
}
