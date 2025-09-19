export type AttrType = "number" | "string" | "boolean" | "tuple";

export type CompileResult = string;

type Validator<T> = (value: unknown) => value is T;

interface AttributeSpecBase<T> {
  name: string;
  required?: boolean;
  default?: T;
  validator?: Validator<T>;
  produce?: (value: T) => Record<string, unknown>;
}

export type TupleItemType = "number" | "string" | "identifier";

export interface NumberAttributeSpec extends AttributeSpecBase<number> {
  type: "number";
}

export interface StringAttributeSpec extends AttributeSpecBase<string> {
  type: "string";
}

export interface BooleanAttributeSpec extends AttributeSpecBase<boolean> {
  type: "boolean";
}

export interface TupleAttributeSpec
  extends AttributeSpecBase<number[] | string[] | (number | string)[]> {
  type: "tuple";
  length: number;
  itemTypes?: TupleItemType[];
}

export type AttributeSpec =
  | NumberAttributeSpec
  | StringAttributeSpec
  | BooleanAttributeSpec
  | TupleAttributeSpec;

export const numberAttr = (
  name: string,
  opts: Partial<Omit<NumberAttributeSpec, "name" | "type">> = {}
): NumberAttributeSpec => ({
  name,
  type: "number",
  validator: (value): value is number => typeof value === "number",
  ...opts,
});

export const stringAttr = (
  name: string,
  opts: Partial<Omit<StringAttributeSpec, "name" | "type">> = {}
): StringAttributeSpec => ({
  name,
  type: "string",
  validator: (value): value is string => typeof value === "string",
  ...opts,
});

export const booleanAttr = (
  name: string,
  opts: Partial<Omit<BooleanAttributeSpec, "name" | "type">> = {}
): BooleanAttributeSpec => ({
  name,
  type: "boolean",
  validator: (value): value is boolean => typeof value === "boolean",
  ...opts,
});

export const tupleAttr = (
  name: string,
  length: number,
  opts: Partial<Omit<TupleAttributeSpec, "name" | "type" | "length">> = {}
): TupleAttributeSpec => {
  const { itemTypes, validator, ...rest } = opts;
  const normalizedTypes = itemTypes && itemTypes.length > 0 ? itemTypes : undefined;

  const tupleSpec: TupleAttributeSpec = {
    name,
    type: "tuple",
    length,
    ...(normalizedTypes ? { itemTypes: normalizedTypes } : {}),
    ...(validator ? { validator } : {}),
    ...rest,
  };

  if (!validator && (!normalizedTypes || normalizedTypes.every((type) => type === "number"))) {
    tupleSpec.validator = (value): value is number[] =>
      Array.isArray(value) &&
      value.length === length &&
      value.every((item) => typeof item === "number");
  }

  return tupleSpec;
};

export const produceNumberPair = (
  firstKey: string,
  secondKey: string
) =>
  (values: Array<number | string>): Record<string, number> => {
    const [first, second] = values as [number, number];
    return {
      [firstKey]: first,
      [secondKey]: second,
    } as Record<string, number>;
  };

export const produceScalar = (key: string) =>
  (value: number): Record<string, number> => ({ [key]: value });
