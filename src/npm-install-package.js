const npm = require('npm');
const libnpm = require('libnpm');
const tempy = require('tempy');
const _ = require('lodash');
const {promisify} = require('util');

module.exports = installNpmPackage;

async function installNpmPackage(spec) {
    const prefix = tempy.directory();
    const manifest = await libnpm.manifest(spec);

    await promisify(npm.load)({loglevel: 'silent', progress: false});
    const modulePaths = _.fromPairs(await promisify(npm.commands.install)(prefix, [spec]));
    const requestedModule = modulePaths[manifest._id];

    if (!requestedModule) {
        throw new Error(`Could not resolve module for ${spec}`);
    }

    return {
        id: manifest._id,
        module: require(requestedModule)
    }
}
