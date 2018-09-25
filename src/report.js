const Table = require('cli-table');
const chalk = require('chalk');
const _ = require('lodash');

const ACCEPTABLE_PERCENTAGE_SLOWER = 10.0;

module.exports = reportResults;

function reportResults(results) {
    console.log(chalk.yellow('\n### Results:\n'));

    for (const bucketName of Object.keys(results)) {
        const bucket = results[bucketName];

        const rowNames = Object.keys(bucket);
        const columnNames = _.keys(bucket[rowNames[0]]);
        const multipleBaselines = _.size(columnNames) > 2;
        const table = new Table({
            head: [chalk.magenta(bucketName)].concat(columnNames.map(columnName => chalk.blue(columnName))),
        });

        _.forEach(rowNames, (rowName) => {
            table.push(
                [rowName].concat(
                    _.map(columnNames, (columnName) => {
                        const { hz, fastest, slowest } = bucket[rowName][columnName];
                        const color = fastest ? chalk.green : (multipleBaselines && !slowest) ? chalk.yellow : chalk.red;

                        return color(hz);
                    }),
                ),
            );
        });

        console.log(`${table.toString()}\n`);
    }

    console.log(chalk.yellow('### Summary:\n'));

    let overallSuccess = true;

    for (const bucketName of Object.keys(results)) {
        const bucket = results[bucketName];

        for (const benchmarkName of Object.keys(bucket)) {
            const benchmark = bucket[benchmarkName];

            const fastest = _.find(benchmark, { fastest: true });
            const slowest = _.find(benchmark, { slowest: true });
            const percentChange = computePercentChange(slowest, fastest);
            const isFaster = fastest.current;
            const isAcceptable = percentChange.value <= ACCEPTABLE_PERCENTAGE_SLOWER;
            const success = isFaster || isAcceptable;

            overallSuccess = overallSuccess && success;

            let statusSymbol;
            let statusColor;
            let speed;

            if (isFaster) {
                speed = 'faster';
                statusSymbol = '✓';
                statusColor = chalk.green;
            } else if (isAcceptable) {
                speed = 'acceptably slower';
                statusSymbol = '⚠';
                statusColor = chalk.yellow;
            } else {
                speed = 'slower';
                statusSymbol = '✗';
                statusColor = chalk.red;
            }

            console.log(
                `${statusColor(statusSymbol)} ${bucketName} ➭ ${benchmarkName} is ${statusColor(
                    `${percentChange.prettyValue}% ${speed}.`,
                )}`,
            );
        }
    }

    if (!overallSuccess) {
        console.log('\n');
        console.log(
            chalk.red(
                '⚠ Benchmarks failed to perform better than the currently published version.',
            ),
        );
        console.log(
            chalk.yellow(
                '- Please determine if the performance changes are expected and acceptable.',
            ),
        );
    }
}

function computePercentChange(slowestBenchmark, fastestBenchmark) {
    const fastestHz = fastestBenchmark.hz;
    const slowestHz = slowestBenchmark.hz;
    const delta = fastestHz - slowestHz;
    const percentChange = Math.abs((delta / slowestHz) * 100);
    const prettyPercentChange = Number.parseFloat(percentChange).toPrecision(4);

    return {
        value: percentChange,
        prettyValue: prettyPercentChange,
    };
}
