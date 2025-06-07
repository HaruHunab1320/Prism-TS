import {
  Context,
  ContextStack,
  ContextManager,
  ContextAware,
  ContextTransition,
  ContextError,
  ContextValidator,
  createContext,
  withContext,
} from './context';

describe('Context Management System', () => {
  describe('Context', () => {
    it('should create contexts with properties', () => {
      const context = new Context('Medical', {
        domain: 'healthcare',
        permissions: ['read_patient_data', 'analyze'],
        confidence_threshold: 0.8,
      });

      expect(context.name).toBe('Medical');
      expect(context.properties.domain).toBe('healthcare');
      expect(context.properties.confidence_threshold).toBe(0.8);
      expect(context.properties.permissions).toEqual(['read_patient_data', 'analyze']);
    });

    it('should support context inheritance', () => {
      const parent = new Context('Medical', { domain: 'healthcare' });
      const child = new Context('Cardiology', { specialty: 'heart' }, parent);

      expect(child.parent).toBe(parent);
      expect(child.getInheritedProperty('domain')).toBe('healthcare');
      expect(child.getInheritedProperty('specialty')).toBe('heart');
      expect(child.getInheritedProperty('nonexistent')).toBeUndefined();
    });

    it('should validate context compatibility', () => {
      const medical = new Context('Medical', { domain: 'healthcare' });
      const financial = new Context('Financial', { domain: 'finance' });
      const cardiology = new Context('Cardiology', { domain: 'healthcare' });

      expect(medical.isCompatibleWith(cardiology)).toBe(true);
      expect(medical.isCompatibleWith(financial)).toBe(false);
    });

    it('should create context scopes', () => {
      const context = new Context('Test', { var1: 'value1' });
      const scope = context.createScope({ var2: 'value2' });

      expect(scope.context).toBe(context);
      expect(scope.variables.var2).toBe('value2');
      expect(scope.getVariable('var2')).toBe('value2');
      expect(scope.getVariable('nonexistent')).toBeUndefined();
    });
  });

  describe('ContextStack', () => {
    it('should manage context stack operations', () => {
      const stack = new ContextStack();
      const context1 = new Context('First', {});
      const context2 = new Context('Second', {});

      expect(stack.isEmpty()).toBe(true);
      expect(stack.current()).toBeUndefined();

      stack.push(context1);
      expect(stack.current()).toBe(context1);
      expect(stack.depth()).toBe(1);

      stack.push(context2);
      expect(stack.current()).toBe(context2);
      expect(stack.depth()).toBe(2);

      const popped = stack.pop();
      expect(popped).toBe(context2);
      expect(stack.current()).toBe(context1);
    });

    it('should handle stack underflow gracefully', () => {
      const stack = new ContextStack();
      expect(() => stack.pop()).toThrow(ContextError);
    });

    it('should find contexts in stack', () => {
      const stack = new ContextStack();
      const medical = new Context('Medical', {});
      const cardiology = new Context('Cardiology', {});

      stack.push(medical);
      stack.push(cardiology);

      expect(stack.findContext('Medical')).toBe(medical);
      expect(stack.findContext('Cardiology')).toBe(cardiology);
      expect(stack.findContext('Nonexistent')).toBeUndefined();
    });

    it('should provide context path', () => {
      const stack = new ContextStack();
      const root = new Context('Root', {});
      const medical = new Context('Medical', {});
      const cardiology = new Context('Cardiology', {});

      stack.push(root);
      stack.push(medical);
      stack.push(cardiology);

      const path = stack.getContextPath();
      expect(path).toEqual(['Root', 'Medical', 'Cardiology']);
    });
  });

  describe('ContextTransition', () => {
    it('should create valid transitions', () => {
      const from = new Context('Medical', {});
      const to = new Context('Treatment', {});
      const transition = new ContextTransition(from, to, {
        preserveState: true,
        validationRules: ['maintain_patient_context'],
      });

      expect(transition.from).toBe(from);
      expect(transition.to).toBe(to);
      expect(transition.options.preserveState).toBe(true);
    });

    it('should validate transitions', () => {
      const medical = new Context('Medical', { domain: 'healthcare' });
      const treatment = new Context('Treatment', { domain: 'healthcare' });
      const financial = new Context('Financial', { domain: 'finance' });

      const validTransition = new ContextTransition(medical, treatment);
      const invalidTransition = new ContextTransition(medical, financial);

      expect(validTransition.isValid()).toBe(true);
      expect(invalidTransition.isValid()).toBe(false);
    });

    it('should execute transitions with state preservation', () => {
      const from = new Context('Medical', {});
      const to = new Context('Treatment', {});
      const transition = new ContextTransition(from, to, { preserveState: true });

      from.createScope({ patientId: '12345', diagnosis: 'condition' });
      const result = transition.execute();

      expect(result.success).toBe(true);
      expect(result.newContext).toBe(to);
      
      if (result.success && transition.options.preserveState) {
        expect(result.preservedState).toBeDefined();
      }
    });
  });

  describe('ContextManager', () => {
    it('should manage multiple contexts', () => {
      const manager = new ContextManager();
      const medical = new Context('Medical', {});
      const treatment = new Context('Treatment', {});

      manager.registerContext(medical);
      manager.registerContext(treatment);

      expect(manager.getContext('Medical')).toBe(medical);
      expect(manager.getContext('Treatment')).toBe(treatment);
      expect(manager.getAllContexts()).toHaveLength(2);
    });

    it('should handle context switching', () => {
      const manager = new ContextManager();
      const medical = new Context('Medical', {});
      const treatment = new Context('Treatment', {});

      manager.registerContext(medical);
      manager.registerContext(treatment);

      manager.enterContext('Medical');
      expect(manager.getCurrentContext()).toBe(medical);

      manager.switchContext('Treatment');
      expect(manager.getCurrentContext()).toBe(treatment);

      manager.exitContext();
      expect(manager.getCurrentContext()).toBeUndefined();
    });

    it('should validate context switches', () => {
      const manager = new ContextManager();
      const validator = new ContextValidator([
        (from, _to) => from?.name !== 'Locked' // Can't switch from locked context
      ]);
      manager.setValidator(validator);

      const locked = new Context('Locked', {});
      const normal = new Context('Normal', {});

      manager.registerContext(locked);
      manager.registerContext(normal);

      manager.enterContext('Locked');
      expect(() => manager.switchContext('Normal')).toThrow(ContextError);
    });

    it('should execute context-aware operations', () => {
      const manager = new ContextManager();
      const medical = new Context('Medical', { domain: 'healthcare' });
      manager.registerContext(medical);

      let executionContext: Context | undefined;
      const operation = () => {
        executionContext = manager.getCurrentContext();
        return 'result';
      };

      const result = manager.executeInContext('Medical', operation);
      expect(result).toBe('result');
      expect(executionContext).toBe(medical);
    });
  });

  describe('ContextAware Operations', () => {
    class TestContextAware implements ContextAware {
      private context?: Context;

      getCurrentContext(): Context | undefined {
        return this.context;
      }

      setContext(context: Context): void {
        this.context = context;
      }

      inContext<T>(context: Context, operation: () => T): T {
        const previous = this.context;
        this.context = context;
        try {
          return operation();
        } finally {
          this.context = previous;
        }
      }
    }

    it('should support context-aware operations', () => {
      const contextAware = new TestContextAware();
      const testContext = new Context('Test', { value: 42 });

      expect(contextAware.getCurrentContext()).toBeUndefined();

      const result = contextAware.inContext(testContext, () => {
        expect(contextAware.getCurrentContext()).toBe(testContext);
        return 'success';
      });

      expect(result).toBe('success');
      expect(contextAware.getCurrentContext()).toBeUndefined();
    });
  });

  describe('Utility Functions', () => {
    it('should create contexts with helper function', () => {
      const context = createContext('Test', { prop: 'value' });
      expect(context.name).toBe('Test');
      expect(context.properties.prop).toBe('value');
    });

    it('should execute operations with context helper', () => {
      const context = createContext('Test', { value: 42 });
      
      const result = withContext(context, (ctx) => {
        expect(ctx).toBe(context);
        return ctx.properties.value;
      });

      expect(result).toBe(42);
    });
  });

  describe('Error Handling', () => {
    it('should handle context errors appropriately', () => {
      const error = new ContextError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ContextError');
    });

    it('should validate context operations', () => {
      const validator = new ContextValidator([
        (_from, to) => to?.name !== 'Forbidden'
      ]);

      const normal = new Context('Normal', {});
      const forbidden = new Context('Forbidden', {});

      expect(() => validator.validateTransition(normal, forbidden))
        .toThrow(ContextError);
    });
  });
});