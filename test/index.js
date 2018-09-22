'use strict';

const createRegressionBenchmark = require('..');

const benchmarks = createRegressionBenchmark({name: 'latest', module: 'prom-client'}, [
    'prom-client@11.1.2',
    'prom-client@11.1.1',
    'prom-client@11.1.0'
]);

benchmarks.suite('registry', require('./registry'));
benchmarks.suite('histogram', require('./histogram'));
benchmarks.run().catch(err => {
    console.error(err.stack);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});
