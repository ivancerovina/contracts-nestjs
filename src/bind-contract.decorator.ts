import {
  applyDecorators,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  SetMetadata,
  UseFilters,
  UseInterceptors,
} from "@nestjs/common";
import {
  Contract,
  type ContractRequestMethod,
  ContractRouteKeys,
} from "contracts";
import { ContractExceptionFilter } from "./contract.exception-filter";
import {
  CONTRACT_METADATA,
  ContractValidationInterceptor,
} from "./contract-validation.interceptor";

const METHOD_DECORATORS: Record<
  ContractRequestMethod,
  (path?: string) => MethodDecorator
> = {
  GET: Get,
  POST: Post,
  PUT: Put,
  PATCH: Patch,
  DELETE: Delete,
};

export function BindContract<C extends Contract<any, any, any>>(
  contract: C,
  routeName: ContractRouteKeys<C>,
) {
  const route = contract.routes?.[routeName];
  if (!route) {
    throw new Error(`Route '${String(routeName)}' not found in contract.`);
  }

  const methodDecorator =
    METHOD_DECORATORS[route.method as ContractRequestMethod];

  return applyDecorators(
    methodDecorator(route.pathTemplate as string),
    SetMetadata(CONTRACT_METADATA, route),
    UseInterceptors(ContractValidationInterceptor),
    UseFilters(ContractExceptionFilter),
  );
}
