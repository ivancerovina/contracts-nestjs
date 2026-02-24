import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ZodValidationException } from "./contract-validation.interceptor";

@Catch()
export class ContractExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ContractExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ZodValidationException) {
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: exception.message,
          issues: exception.issues,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = exception.message;
      let code = "INTERNAL_SERVER_ERROR"; // Default

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resObj = exceptionResponse as any;
        if (resObj.message)
          message = Array.isArray(resObj.message)
            ? resObj.message.join(", ")
            : resObj.message;
        if (resObj.error)
          code = resObj.error.toUpperCase().replace(/\s+/g, "_");
      }

      // Map strict status codes if possible/needed, but user request was vague on "code" for generic errors.
      // "OR specifically for REQUEST VALIDATION ERRORS: ... code: BAD_REQUEST ... issues: ..."
      // "SERVER RESPONSE VALIDATION ERRORS SHOULD THROW 500 ERROR AND JUST SAY 'Invalid server response' as message and INTERNAL_SERVER_ERROR as code"

      // If it's the 500 we threw:
      if (status === 500 && message === "Invalid server response") {
        response.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid server response",
          },
        });
        return;
      }

      // For other HttpExceptions, try to be helpful but safe
      response.status(status).json({
        success: false,
        error: {
          code: code,
          message: message,
        },
      });
      return;
    }

    // Unknown errors
    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
}
