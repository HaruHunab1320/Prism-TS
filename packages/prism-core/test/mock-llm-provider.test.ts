import { MockLLMProvider, LLMRequest } from '../src';

describe('MockLLMProvider (core)', () => {
  it('uses queued responses before falling back to defaults', async () => {
    const provider = new MockLLMProvider();
    provider.queueResponse({ content: 'First', confidence: 0.9 });
    provider.setMockResponse('Default', 0.5, 'default reasoning');

    const request = new LLMRequest('test', { includeReasoning: true });
    const first = await provider.complete(request);
    const second = await provider.complete(request);

    expect(first.content).toBe('First');
    expect(first.confidence).toBe(0.9);
    expect(second.content).toBe('Default');
    expect(second.metadata?.reasoning).toBe('default reasoning');
  });

  it('honors failure rate with injected random generator', async () => {
    let called = 0;
    const provider = new MockLLMProvider({ random: () => (called++ === 0 ? 0 : 1) });
    provider.setFailureRate(0.5);

    await expect(provider.complete(new LLMRequest('should fail'))).rejects.toThrow('Mock provider failure');
    await expect(provider.complete(new LLMRequest('should pass'))).resolves.toBeTruthy();
  });

  it('streams text and supports cancellation', async () => {
    const provider = new MockLLMProvider({ defaultResponse: { content: 'Hello streaming world', confidence: 0.8 } });
    const session = provider.stream(new LLMRequest('stream'));
    const iterator = session[Symbol.asyncIterator]();

    const firstChunk = await iterator.next();
    expect(firstChunk.done).toBeFalsy();
    expect(firstChunk.value?.type).toBe('text');

    session.cancel();
    await expect(session.response).rejects.toThrow('Mock stream cancelled');
  });

  it('generates deterministic embeddings', async () => {
    const provider = new MockLLMProvider();
    const a = await provider.embed('deterministic text');
    const b = await provider.embed('deterministic text');
    expect(a).toEqual(b);
    expect(a).toHaveLength(384);
  });
});
