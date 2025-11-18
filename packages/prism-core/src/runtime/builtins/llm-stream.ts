import {
  Value,
  StringValue,
  ObjectValue,
  NullValue,
  FunctionValue,
  PromiseValue,
  ConfidenceValue as RuntimeConfidenceValue,
} from '../values';
import { RuntimeError } from '../errors';
import {
  LLMProvider,
  LLMRequest,
  LLMStreamingSession,
  LLMStreamChunk,
  LLMResponse,
  LLMOptions,
} from '../../llm-types';
import { ConfidenceValue as ConfidenceLib } from '../../confidence';
import {
  extractPrompt,
  parseLLMOptions,
  buildResponseValue,
  toConfidence,
} from './llm-shared';

export function createLLMStreamBuiltin(
  getProvider: (providerName?: string) => LLMProvider | undefined
) {
  return async (args: Value[]): Promise<Value> => {
    if (args.length === 0) {
      throw new RuntimeError('stream_llm() requires at least one argument');
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

    const request = new LLMRequest(promptString, requestOptions);
    const session = provider.stream
      ? provider.stream(request)
      : createFallbackSession(provider, request);

    return createStreamHandle(session, provider, promptString, requestOptions, extractor);
  };
}

function createStreamHandle(
  session: LLMStreamingSession,
  provider: LLMProvider,
  prompt: string,
  requestOptions: LLMOptions,
  extractor?: FunctionValue
): ObjectValue {
  const queue: LLMStreamChunk[] = [];
  const waiters: Array<(result: IteratorResult<LLMStreamChunk | null>) => void> = [];
  let iteratorDone = false;
  let iteratorError: unknown;

  (async () => {
    try {
      for await (const chunk of session) {
        if (waiters.length > 0) {
          const resolve = waiters.shift()!;
          resolve({ value: chunk, done: false });
        } else {
          queue.push(chunk);
        }
      }
      iteratorDone = true;
      while (waiters.length > 0) {
        const resolve = waiters.shift()!;
        resolve({ value: null, done: true });
      }
    } catch (error) {
      iteratorError = error;
      iteratorDone = true;
      while (waiters.length > 0) {
        const resolve = waiters.shift()!;
        resolve({ value: null, done: true });
      }
    }
  })();

  const getNextChunk = async (): Promise<LLMStreamChunk | null> => {
    if (iteratorError) {
      throw iteratorError instanceof Error
        ? iteratorError
        : new RuntimeError(String(iteratorError));
    }
    if (queue.length > 0) {
      return queue.shift()!;
    }
    if (iteratorDone) {
      return null;
    }
    return new Promise((resolve, reject) => {
      waiters.push(({ value, done }) => {
        if (iteratorError) {
          reject(iteratorError);
          return;
        }
        if (done || !value) {
          resolve(null);
        } else {
          resolve(value);
        }
      });
    });
  };

  const nextFn = new FunctionValue('next', async () => {
    const chunk = await getNextChunk();
    if (!chunk) {
      return new NullValue();
    }
    return chunkToValue(chunk);
  });

  const cancelFn = new FunctionValue('cancel', async () => {
    session.cancel();
    return new NullValue();
  });

  const resultPromise = session.response.then(async (response) => {
    const responseValue = buildResponseValue(response, provider, prompt, requestOptions);
    let confidence = new ConfidenceLib(response.confidence);

    if (extractor) {
      const extractorResult = await extractor.value([responseValue]);
      confidence = toConfidence(extractorResult);
    }

    return new RuntimeConfidenceValue(
      new StringValue(response.content),
      confidence
    );
  });

  const resultFn = new FunctionValue('result', async () => {
    return new PromiseValue(resultPromise);
  });

  const props = new Map<string, Value>();
  props.set('next', nextFn);
  props.set('cancel', cancelFn);
  props.set('result', resultFn);

  return new ObjectValue(props);
}

function chunkToValue(chunk: LLMStreamChunk): Value {
  const props = new Map<string, Value>();
  props.set('type', new StringValue(chunk.type));
  if (chunk.content) {
    props.set('text', new StringValue(chunk.content));
  }
  if (chunk.reasoning) {
    props.set('reasoning', new StringValue(chunk.reasoning));
  }
  if (chunk.error) {
    props.set('error', new StringValue(chunk.error));
  }
  return new ObjectValue(props);
}

function createFallbackSession(provider: LLMProvider, request: LLMRequest): LLMStreamingSession {
  let cancelled = false;
  let rejectResponse: (reason?: unknown) => void = () => {};

  const responsePromise = new Promise<LLMResponse>((resolve, reject) => {
    rejectResponse = reject;
    provider.complete(request).then(
      (response) => {
        if (cancelled) {
          reject(new RuntimeError('LLM stream cancelled'));
          return;
        }
        resolve(response);
      },
      (error) => reject(error)
    );
  });

  const iterator = (async function* () {
    const response = await responsePromise;
    if (!cancelled) {
      yield { type: 'text', content: response.content } as LLMStreamChunk;
    }
  })();

  return {
    response: responsePromise,
    [Symbol.asyncIterator]() {
      return iterator;
    },
    cancel: () => {
      cancelled = true;
      rejectResponse(new RuntimeError('LLM stream cancelled'));
    },
  };
}
