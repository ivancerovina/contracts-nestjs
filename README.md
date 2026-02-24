# Contracts NestJS

NestJS utilities for [contracts](https://github.com/ivancerovina/contracts) — decorators, validation, and error handling.

## Installation

```bash
pnpm add github:ivancerovina/contracts-nestjs
```

## Usage

### `@BindContract`

Automatically applies the HTTP method, path, validation interceptor, and error filter. No manual `@Get()` / `@Post()` decorators needed.

```typescript
import { Controller, Body, Query, Param } from "@nestjs/common";
import { BindContract } from "contracts-nestjs";
import { myFeatureContract } from "./my-contract";

@Controller()
export class MyController {
  @BindContract(myFeatureContract, "getItems")
  async getItems(@Query() query: any) {
    return [{ id: "1", name: "Item 1" }];
  }

  @BindContract(myFeatureContract, "createItem")
  async createItem(@Body() body: any) {
    return { id: "123" };
  }
}
```

### Automatic Behaviors

1. **HTTP Method & Path** — derived from the contract route (`method` + `pathTemplate`)
2. **Request Validation** — body, query, and params are validated against Zod schemas (400 on failure)
3. **Response Wrapping** — you return `T`, the client receives `{ success: true, data: T }`
4. **Response Validation** — return value is validated against `contract.data`; mismatches throw a 500
5. **Error Handling** — exceptions are formatted as `{ success: false, error: { code, message } }`

### Error Responses

**Validation errors** (400):

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid Request Body",
    "issues": { "name": "String must contain at least 3 character(s)" }
  }
}
```

**Server response validation errors** (500):

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Invalid server response"
  }
}
```

**Other HTTP exceptions** preserve their status code and message in the same `{ success, error }` format.
