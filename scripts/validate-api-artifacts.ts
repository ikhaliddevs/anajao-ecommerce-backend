import { readFileSync } from "node:fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import AjvModule from "ajv-draft-04";

await SwaggerParser.validate("docs/openapi.json");
const response = await fetch(
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  { signal: AbortSignal.timeout(15000) }
);
if (!response.ok) throw new Error(`Postman schema HTTP ${response.status}`);
const schema = (await response.json()) as object;
const validator = new AjvModule.default({ strict: false, allErrors: true, validateFormats: false });
const validate = validator.compile(schema);
for (const milestone of ["02", "03"]) {
  const collection: unknown = JSON.parse(
    readFileSync(`postman/anajao-milestone-${milestone}.postman_collection.json`, "utf8")
  );
  if (!validate(collection)) throw new Error(JSON.stringify(validate.errors));
  const environment: unknown = JSON.parse(
    readFileSync(`postman/anajao-milestone-${milestone}.postman_environment.json`, "utf8")
  );
  if (
    !environment ||
    typeof environment !== "object" ||
    !("values" in environment) ||
    !Array.isArray(environment.values)
  )
    throw new Error("Invalid Postman environment");
}
console.log(
  "OpenAPI specification and Postman Collection v2.1 schema validation passed; environment parsed"
);
