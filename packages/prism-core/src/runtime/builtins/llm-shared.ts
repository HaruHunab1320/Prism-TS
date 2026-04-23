import {
  Value,
  StringValue,
  NumberValue,
  BooleanValue,
  NullValue,
  ObjectValue,
  ArrayValue,
  FunctionValue,
  ConfidenceValue as RuntimeConfidenceValue,
} from '../values';
import { RuntimeError } from '../errors';
import { LLMOptions, LLMResponse, LLMProvider } from '../../llm-types';
import { ConfidenceValue as ConfidenceLib } from '../../confidence';

export interface ParsedLLMCallOptions {
  providerName?: string;
  requestOptions: LLMOptions;
  extractor?: FunctionValue;
}

export function extractPrompt(value: Value): string {
  if (value instanceof StringValue) {
    return value.value;
  }

  if (value instanceof RuntimeConfidenceValue && value.value instanceof StringValue) {
    return value.value.value;
  }

  throw new RuntimeError('llm() first argument must be a string');
}

export function parseLLMOptions(optionsValue?: Value): ParsedLLMCallOptions {
  if (!optionsValue || optionsValue instanceof NullValue) {
    return { requestOptions: {} };
  }

  if (!(optionsValue instanceof ObjectValue)) {
    throw new RuntimeError('llm() options must be an object');
  }

  const requestOptions: LLMOptions = {};
  let providerName: string | undefined;
  let extractor: FunctionValue | undefined;

  const providerValue = getProperty(optionsValue, 'provider') ?? getProperty(optionsValue, 'providerName');
  if (isPresent(providerValue)) {
    providerName = expectString(providerValue!, 'provider');
  }

  const modelValue = getProperty(optionsValue, 'model');
  if (isPresent(modelValue)) {
    requestOptions.model = expectString(modelValue!, 'model');
  }

  const temperatureValue = getProperty(optionsValue, 'temperature');
  if (isPresent(temperatureValue)) {
    requestOptions.temperature = expectNumber(temperatureValue!, 'temperature');
  }

  const maxTokensValue = getProperty(optionsValue, 'maxTokens');
  if (isPresent(maxTokensValue)) {
    requestOptions.maxTokens = expectNumber(maxTokensValue!, 'maxTokens');
  }

  const topPValue = getProperty(optionsValue, 'topP');
  if (isPresent(topPValue)) {
    requestOptions.topP = expectNumber(topPValue!, 'topP');
  }

  const timeoutValue = getProperty(optionsValue, 'timeout');
  if (isPresent(timeoutValue)) {
    requestOptions.timeout = expectNumber(timeoutValue!, 'timeout');
  }

  const structuredOutputValue = getProperty(optionsValue, 'structuredOutput');
  if (isPresent(structuredOutputValue)) {
    requestOptions.structuredOutput = expectBoolean(structuredOutputValue!, 'structuredOutput');
  }

  const includeReasoningValue = getProperty(optionsValue, 'includeReasoning');
  if (isPresent(includeReasoningValue)) {
    requestOptions.includeReasoning = expectBoolean(includeReasoningValue!, 'includeReasoning');
  }

  const extractorValue = getProperty(optionsValue, 'extractor');
  if (isPresent(extractorValue)) {
    if (!(extractorValue instanceof FunctionValue)) {
      throw new RuntimeError('llm() extractor must be a function');
    }
    extractor = extractorValue;
  }

  const confidenceExtractorValue = getProperty(optionsValue, 'confidenceExtractor');
  if (isPresent(confidenceExtractorValue)) {
    requestOptions.confidenceExtractor = confidenceExtractorValue as any;
  }

  return { providerName, requestOptions, extractor };
}

export function buildResponseValue(
  response: LLMResponse,
  provider: LLMProvider,
  prompt: string,
  requestOptions: LLMOptions
): ObjectValue {
  const props = new Map<string, Value>();
  props.set('content', new StringValue(response.content));
  props.set('confidence', new NumberValue(response.confidence));
  props.set('model', new StringValue(response.model));
  props.set('tokensUsed', new NumberValue(response.tokensUsed));
  props.set('provider', new StringValue(provider.name));
  props.set('prompt', new StringValue(prompt));
  props.set('options', convertToValue(requestOptions));

  if (response.metadata !== undefined) {
    props.set('metadata', convertToValue(response.metadata));
  }

  return new ObjectValue(props);
}

export function toConfidence(value: Value): ConfidenceLib {
  if (value instanceof NumberValue) {
    return new ConfidenceLib(value.value);
  }

  if (value instanceof RuntimeConfidenceValue) {
    return value.confidence;
  }

  if (value instanceof ObjectValue) {
    const confidenceProperty = value.properties.get('confidence');
    if (confidenceProperty && confidenceProperty instanceof NumberValue) {
      return new ConfidenceLib(confidenceProperty.value);
    }
  }

  throw new RuntimeError('llm() extractor must return a number, confident value, or object with a numeric confidence field');
}

export function convertToValue(input: unknown): Value {
  if (typeof input === 'string') {
    return new StringValue(input);
  }
  if (typeof input === 'number') {
    return new NumberValue(input);
  }
  if (typeof input === 'boolean') {
    return new BooleanValue(input);
  }
  if (input === null) {
    return new NullValue();
  }
  if (input === undefined) {
    return new NullValue();
  }
  if (Array.isArray(input)) {
    return new ArrayValue(input.map(item => convertToValue(item)));
  }
  if (typeof input === 'object') {
    const props = new Map<string, Value>();
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      props.set(key, convertToValue(value));
    }
    return new ObjectValue(props);
  }
  return new NullValue();
}

function getProperty(obj: ObjectValue, key: string): Value | undefined {
  return obj.properties.get(key);
}

function isPresent(value?: Value): boolean {
  return !!value && !(value instanceof NullValue) && !(value instanceof NullValue);
}

function expectString(value: Value, field: string): string {
  if (value instanceof StringValue) {
    return value.value;
  }
  throw new RuntimeError(`llm() option '${field}' must be a string`);
}

function expectNumber(value: Value, field: string): number {
  if (value instanceof NumberValue) {
    return value.value;
  }
  throw new RuntimeError(`llm() option '${field}' must be a number`);
}

function expectBoolean(value: Value, field: string): boolean {
  if (value instanceof BooleanValue) {
    return value.value;
  }
  throw new RuntimeError(`llm() option '${field}' must be a boolean`);
}
