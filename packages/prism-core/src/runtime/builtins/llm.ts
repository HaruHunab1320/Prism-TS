import {
  Value,
  StringValue,
  ConfidenceValue as RuntimeConfidenceValue,
} from '../values';
import { RuntimeError } from '../errors';
import { LLMProvider, LLMRequest } from '../../llm-types';
import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import {
  extractPrompt,
  parseLLMOptions,
  buildResponseValue,
  toConfidence,
} from './llm-shared';

export function createLLMBuiltin(
  getProvider: (providerName?: string) => LLMProvider | undefined
) {
  return async (args: Value[]): Promise<Value> => {
    if (args.length === 0) {
      throw new RuntimeError('llm() requires at least one argument');
    }

    const promptValue = args[0];
    const optionsValue = args[1];

    const promptString = extractPrompt(promptValue);
    const { providerName, requestOptions, extractor } = parseLLMOptions(optionsValue);

    const provider = getProvider(providerName);
    if (!provider) {
      if (providerName) {
        throw new RuntimeError(`LLM provider '${providerName}' not found`);
      }
      throw new RuntimeError('No LLM provider configured');
    }

    try {
      const request = new LLMRequest(promptString, requestOptions);
      const response = await provider.complete(request);

      const responseValue = buildResponseValue(response, provider, promptString, requestOptions);
      let confidence = new ConfidenceLib(response.confidence);

      if (extractor) {
        const extractorResult = await extractor.value([responseValue]);
        confidence = toConfidence(extractorResult);
      }

      return new RuntimeConfidenceValue(
        new StringValue(response.content),
        confidence
      );
    } catch (error) {
      throw new RuntimeError(`LLM call failed: ${(error as Error).message}`);
    }
  };
}
