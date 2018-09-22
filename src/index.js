const _ = require('lodash');
const benchmark = require('benchmark');
const chalk = require('chalk');
const npmInstallPackage = require('./npm-install-package');
const reportResults = require('./report');

module.exports = createRegressionBenchmark;

function createRegressionBenchmark(baseModule, comparisonModules = []) {
    baseModule = moduleMetadata(baseModule, true);
    comparisonModules = comparisonModules.map(moduleMetadata);

    const testModules = [baseModule].concat(comparisonModules);
    const buckets = {};
    const results = {};

    async function run() {
        console.log(chalk.green('\n# Benchmark Regression\n'));
        console.log(chalk.magenta('## Installing baseline packages\n'));

        await installTestModules(testModules);

        console.log(chalk.magenta('## Starting benchmark suite\n'));

        console.log(chalk.yellow('### Progress:\n'));

        for (const bucketName of Object.keys(buckets)) {
            const bucket = buckets[bucketName];


            for (const benchmarkName of Object.keys(bucket)) {
                const { fn, opts: { setup, teardown } } = bucket[benchmarkName];

                const fastest = { time: -Infinity };
                const slowest = { time: +Infinity };

                for (const testModule of testModules) {
                    const name = `${bucketName} ➭ ${benchmarkName} ➭ ${testModule.name}`;
                    const ctx = await Promise.resolve(setup(testModule.module));
                    const result = await new Promise((resolve, reject) => {
                        const bench = new benchmark.Benchmark(name, () => fn(testModule.module, ctx));

                        bench.on('complete', (event) => {
                            if (event.target.error) {
                                console.log(`- ${event.target.toString()}\n${event.target.error.stack}`);

                                reject({
                                    name,
                                    bucket: bucketName,
                                    benchmark: benchmarkName,
                                    module: testModule.name,
                                    error: event.target.error,
                                });
                            } else {
                                console.log(`- ${event.target.toString()}`);

                                if (bench.hz > fastest.time) {
                                    fastest.name = testModule.name;
                                    fastest.time = bench.hz;
                                }
                                if (bench.hz < slowest.time) {
                                    slowest.name = testModule.name;
                                    slowest.time = bench.hz;
                                }

                                resolve({
                                    name,
                                    bucket: bucketName,
                                    benchmark: benchmarkName,
                                    module: testModule.name,
                                    current: testModule.current,
                                    hz: bench.hz,
                                    stats: bench.stats,
                                    times: bench.times,
                                });
                            }
                        });

                        bench.run();
                    });

                    _.set(results, [bucketName, benchmarkName, result.module], result);

                    await Promise.resolve(teardown(testModule.module, ctx));
                }

                _.set(results, [bucketName, benchmarkName, fastest.name, 'fastest'], true);
                _.set(results, [bucketName, benchmarkName, slowest.name, 'slowest'], true);
            }
        }

        reportResults(results);

        return results;
    }

    const getApi = (defaultOpts = {}) => {
        const api = {
            add(name, fn, opts = {}) {
                opts = Object.assign(
                    {},
                    {
                        bucket: 'regression',
                        setup: () => void 0,
                        teardown: () => void 0,
                    },
                    defaultOpts,
                    opts,
                );
                _.defaults(buckets, { [opts.bucket]: {} });

                const bucket = buckets[opts.bucket];

                if (_.has(bucket, name)) {
                    throw new Error(`Bucket ${opts.bucket} already has benchmark ${name}.`);
                }

                bucket[name] = { fn, opts };

                return api;
            },
            suite(bucket, setup) {
                const suiteApi = getApi({bucket});
                setup(suiteApi);
                return api;
            },
            run
        };

        return api;
    };

    return getApi()
}

async function installTestModules(testModules) {
    for (const testModule of testModules) {
        if (typeof testModule.module === 'string') {
            const {id, module} = await npmInstallPackage(testModule.module);

            testModule.module = module;
            testModule.id = id;
        }
    }
}

function moduleMetadata(mod, current) {
    const name = mod.name || (typeof mod === 'string' && mod) || (current === true && 'current');
    const module = mod.module || mod;

    if (!name) {
        throw new Error('Malformed benchmark module. Must either be a npm package spec string, or an object of form {name: "my-package", module: require("my-package")}');
    }

    return {
        name,
        module,
        current,
    };
}
