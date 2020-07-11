import { strict as assert } from 'assert';
import { feathers, version, Feathers } from '../src'

describe('Feathers application', () => {
  it('initializes', () => {
    const app = feathers();
    
    assert.ok(app instanceof Feathers);
  });

  it('sets the version on main and app instance', () => {
    const app = feathers();

    assert.ok(version > '4.0.0');
    assert.ok(app.version > '4.0.0');
  });

  describe('.set()', () => {
    it('should set a value', () => {
      const app = feathers();
      app.set('foo', 'bar');
      assert.strictEqual(app.get('foo'), 'bar');
    });

    it('should return the app', () => {
      const app = feathers();
      assert.strictEqual(app.set('foo', 'bar'), app);
    });

    it('should return the app when undefined', () => {
      const app = feathers();
      assert.strictEqual(app.set('foo', undefined), app);
    });
  });

  describe('.get()', () => {
    it('should return undefined when unset', () => {
      const app = feathers();
      assert.strictEqual(app.get('foo'), undefined);
    });

    it('should otherwise return the value', () => {
      const app = feathers();
      app.set('foo', 'bar');
      assert.strictEqual(app.get('foo'), 'bar');
    });
  });

  it('.get and .set with SettingTypes', () => {
    class SettingTypes {
      port: number;
      foo: string;
    }

    const app = feathers<{}, SettingTypes>();

    app.set('port', 10);
    app.set('foo', 'something');

    assert.equal(app.get('port'), 10);
    assert.equal(app.get('foo'), 'something');
  });

  it('additionally passes `app` as .configure parameter (#558)', done => {
    feathers().configure(function (this: any, app: any) {
      assert.strictEqual(this, app);
      done();
    });
  });

  describe('Services', () => {
    it('calling .use with invalid path throws', () => {
      const app = feathers();

      try {
        app.use(null, {});
      } catch (e) {
        assert.strictEqual(e.message, `'null' is not a valid service path.`);
      }

      try {
        //@ts-ignore
        app.use({}, {});
      } catch (e) {
        assert.strictEqual(e.message, `'[object Object]' is not a valid service path.`);
      }
    });

    it('calling .use with a non service object throws', () => {
      const app = feathers();

      try {
        app.use('/bla', {});
        assert.ok(false, 'Should never get here');
      } catch (e) {
        assert.strictEqual(e.message, 'Invalid service object passed for path `bla`');
      }
    });

    it('registers and wraps a new service', async () => {
      const dummyService = {
        setup (this: any, _app: any, path: string) {
          this.path = path;
        },

        async create (data: any) {
          return data;
        }
      };

      const app = feathers().use('/dummy', dummyService);
      const wrappedService = app.service('dummy');

      assert.equal(Object.getPrototypeOf(wrappedService), dummyService);

      const data = await wrappedService.create({
        message: 'Test message'
      }, {});
      
      assert.strictEqual(data.message, 'Test message');
    });

    it('can use a root level service', async () => {
      const app = feathers().use('/', {
        get (id: string) {
          return Promise.resolve({ id });
        }
      });

      const result = await app.service('/').get('test');
      
      assert.deepStrictEqual(result, { id: 'test' });
    });

  //   it('services can be re-used (#566)', done => {
  //     const app1 = feathers();
  //     const app2 = feathers();

  //     app2.use('/dummy', {
  //       create (data: any) {
  //         return Promise.resolve(data);
  //       }
  //     });

  //     const dummy = app2.service('dummy');

  //     dummy.hooks({
  //       before: {
  //         create (hook: HookContext) {
  //           hook.data.fromHook = true;
  //         }
  //       }
  //     });

  //     dummy.on('created', (data: any) => {
  //       assert.deepStrictEqual(data, {
  //         message: 'Hi',
  //         fromHook: true
  //       });
  //       done();
  //     });

  //     app1.use('/testing', app2.service('dummy'));

  //     app1.service('testing').create({ message: 'Hi' });
  //   });

  //   it('async hooks', done => {
  //     const app = feathers();

  //     app.use('/dummy', {
  //       create (data: any) {
  //         return Promise.resolve(data);
  //       }
  //     });

  //     const dummy = app.service('dummy');

  //     dummy.hooks({
  //       async: async (ctx: any, next: any) => {
  //         await next();
  //         ctx.params.fromAsyncHook = true;
  //       },
  //       before: {
  //         create (hook: any) {
  //           hook.params.fromAsyncHook = false;
  //         }
  //       }
  //     });

  //     dummy.create({ message: 'Hi' }, {}, true)
  //       .then((ctx: any) => {
  //         assert.ok(ctx.params.fromAsyncHook);
  //       })
  //       .then(done, done);
  //   });

    it('services conserve Symbols', () => {
      const TEST = Symbol('test');
      const dummyService = {
        [TEST]: true,

        setup (this: any, _app: any, path: string) {
          this.path = path;
        },

        async create (data: any) {
          return data;
        }
      };

      const app = feathers().use('/dummy', dummyService);
      const wrappedService = app.service('dummy');

      assert.ok((wrappedService as any)[TEST]);
    });

    it('methods conserve Symbols', () => {
      const TEST = Symbol('test');
      const dummyService = {
        setup (this: any, _app: any, path: string) {
          this.path = path;
        },

        async create (data: any) {
          return data;
        }
      };

      (dummyService.create as any)[TEST] = true;

      const app = feathers().use('/dummy', dummyService);
      const wrappedService = app.service('dummy');

      assert.ok((wrappedService.create as any)[TEST]);
    });
  });
  
  it('is an event emitter', done => {
    const app = feathers();
    const original = { hello: 'world' };

    app.on('test', (data: any) => {
      assert.deepStrictEqual(original, data);
      done();
    });

    app.emit('test', original);
  });

  // it('uses .defaultService if available', async () => {
  //   const app = feathers();

  //   assert.ok(!app.service('/todos/'));

  //   (app as any).defaultService = function (path: string) {
  //     assert.strictEqual(path, 'todos');
  //     return {
  //       get (id: string) {
  //         return Promise.resolve({
  //           id, description: `You have to do ${id}!`
  //         });
  //       }
  //     };
  //   };


  //   const data = await app.service('/todos/').get('dishes');

  //   assert.deepStrictEqual(data, {
  //     id: 'dishes',
  //     description: 'You have to do dishes!'
  //   });
  // });

  // describe('.setup', () => {
  //   it('app.setup calls .setup on all services', () => {
  //     const app = feathers();
  //     let setupCount = 0;

  //     app.use('/dummy', {
  //       setup (appRef: any, path: any) {
  //         setupCount++;
  //         assert.strictEqual(appRef, app);
  //         assert.strictEqual(path, 'dummy');
  //       }
  //     });

  //     app.use('/simple', {
  //       get (id: string) {
  //         return Promise.resolve({ id });
  //       }
  //     });

  //     app.use('/dummy2', {
  //       setup (appRef: any, path: any) {
  //         setupCount++;
  //         assert.strictEqual(appRef, app);
  //         assert.strictEqual(path, 'dummy2');
  //       }
  //     });

  //     app.setup();

  //     assert.ok(app._isSetup);
  //     assert.strictEqual(setupCount, 2);
  //   });

  //   it('registering a service after app.setup will be set up', () => {
  //     const app = feathers();

  //     app.setup();

  //     app.use('/dummy', {
  //       setup (appRef: any, path: any) {
  //         assert.ok(app._isSetup);
  //         assert.strictEqual(appRef, app);
  //         assert.strictEqual(path, 'dummy');
  //       }
  //     });
  //   });

  //   it('calls _setup on a service right away', () => {
  //     const app = feathers();
  //     let _setup = false;

  //     app.use('/dummy', {
  //       get () {},
  //       _setup (appRef: any, path: any) {
  //         _setup = true;
  //         assert.strictEqual(appRef, app);
  //         assert.strictEqual(path, 'dummy');
  //       }
  //     });

  //     assert.ok(_setup);
  //   });
  // });

  // describe('providers', () => {
  //   it('are getting called with a service', () => {
  //     const app = feathers();
  //     let providerRan = false;

  //     app.providers.push(function (service: any, location: any, options: any) {
  //       assert.ok(service.dummy);
  //       assert.strictEqual(location, 'dummy');
  //       assert.deepStrictEqual(options, {});
  //       providerRan = true;
  //     });

  //     app.use('/dummy', {
  //       dummy: true,
  //       get () {}
  //     });

  //     assert.ok(providerRan);

  //     app.setup();
  //   });

  //   it('are getting called with a service and options', () => {
  //     const app = feathers();
  //     const opts = { test: true };

  //     let providerRan = false;

  //     app.providers.push(function (service: any, location: any, options: any) {
  //       assert.ok(service.dummy);
  //       assert.strictEqual(location, 'dummy');
  //       assert.deepStrictEqual(options, opts);
  //       providerRan = true;
  //     });

  //     app.use('/dummy', {
  //       dummy: true,
  //       get () {}
  //     }, opts);

  //     assert.ok(providerRan);

  //     app.setup();
  //   });
  // });

  describe('sub apps', () => {
    it('re-registers sub-app services with prefix', async () => {
      const app = feathers();
      const subApp = feathers();

      subApp.use('/service1', {
        async get (id: string) {
          return {
            id, name: 'service1'
          };
        }
      }).use('/service2', {
        async get (id: string) {
          return {
            id, name: 'service2'
          };
        },

        async create (data: any) {
          return data;
        }
      });

      app.use('/api/', subApp);

      const createdEvent = new Promise(resolve => {
        app.service('/api/service2').once('created', (data: any) => {
          assert.deepStrictEqual(data, {
            message: 'This is a test'
          });

          app.service('api/service2').create({
            message: 'This is another test'
          });

          subApp.service('service2').once('created', (data: any) => {
            assert.deepStrictEqual(data, {
              message: 'This is another test'
            });

            resolve();
          });
        });
      });

      let data = await app.service('/api/service1').get(10);

      assert.strictEqual(data.name, 'service1');

      data = await app.service('/api/service2').get(1);
      
      assert.strictEqual(data.name, 'service2');

      subApp.service('service2').create({
        message: 'This is a test'
      });

      await createdEvent;
    });
  });
});