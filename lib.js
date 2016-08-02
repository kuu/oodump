const config = require('config');
const OoyalaApi = require('ooyala-api').default;
const throughParallel = require('through2-parallel');
const fromArray = require('from2-array');

const api = new OoyalaApi(config.api.key, config.api.secret);

const MAX_CONCURRENCY = 10;
const concurrencies = (config.concurrencies || [1, 1, 2, 2, 2])
  .map(concurrency => Math.min(concurrency, MAX_CONCURRENCY));

function createStream(concurrency, transformFunction, flushFunction) {
  return throughParallel.obj({concurrency}, transformFunction, flushFunction);
}

function extractMetadata(metadata) {
  return `${Object.keys(metadata).map(key => {
    return `${key}: ${metadata[key]}`;
  }).join(', ')}`;
}

module.exports = function (opts) {
  const START_DATE = opts.startDate || '2012-07-12';
  const END_DATE = opts.endDate || '2016-06-30';
  const isDaily = Boolean(opts.daily);

  // Retrieves children of a root label
  const stream1 = createStream(concurrencies[0], function (rootLabel, enc, cb) {
    api.get(`/v2/labels/${rootLabel.id}/children`, {limit: 500}, {recursive: true})
    .then(labels => {
      this.push(rootLabel);
      labels.forEach(label => this.push(label));
      cb();
    })
    .catch(err => {
      console.error(`stream1: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrieves children of a root label: "${label.name}"`);
  });

  // Retrieves assets with a specific label
  const stream2 = createStream(concurrencies[1], function (label, enc, cb) {
    api.get('/v2/assets', {where: `labels+INCLUDES+'${label.name}'`}, {recursive: true})
    .then(assets => {
      assets.forEach(asset => {
        asset.label = label.full_name;
        this.push(asset);
      });
      cb();
    })
    .catch(err => {
      console.error(`stream2: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives assets with a label: "${label.name}"`);
  });

  // Retrieves metadata of an asset
  const stream3 = createStream(concurrencies[2], function (asset, enc, cb) {
    api.get(`/v2/assets/${asset.embed_code}/metadata`)
    .then(metadata => {
      asset.metadata = metadata;
      this.push(asset);
      cb();
    })
    .catch(err => {
      console.error(`stream3: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives metadata of an asset: "${asset.name}"`);
  });

  // Retrieves daily performance of an asset
  const stream4 = createStream(concurrencies[3], function (asset, enc, cb) {
    const requestURL = `/v2/analytics/reports/asset/${asset.embed_code}/performance/total/${START_DATE}...${END_DATE}`;
    const flags = isDaily ? {breakdown_by: 'day'} : {};
    api.get(requestURL, flags)
    .then(body => {
      let performance = null;
      if (body.results) {
        performance = isDaily ? body.results.total : body.results;
      }
      this.push({
        label: asset.label,
        embedCode: asset.embed_code,
        title: asset.name,
        metadata: asset.metadata,
        performance
      });
      cb();
    })
    .catch(err => {
      console.error(`stream4: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives daily performance of an asset: "${asset.name}"`);
  });

  let currentLabel;

  // Writes to destination
  const stream5 = createStream(concurrencies[4], (asset, enc, cb) => {
    if (currentLabel !== asset.label) {
      currentLabel = asset.label;
      console.log(`=====<label="${currentLabel}">=====`);
    }
    const {embedCode, title, metadata, performance} = asset;
    const header = `{embedCode: "${embedCode}", metadata: {${extractMetadata(metadata)}} title: "${title}"}`;
    const row = [];
    if (performance) {
      performance.forEach(day => {
        const metrics = day.metrics;
        if (metrics.video && metrics.video.plays) {
          const plays = Number.parseInt(metrics.video.plays, 10);
          if (Number.isInteger(plays)) {
            row.push(metrics.video.plays);
          } else {
            row.push('0');
          }
        } else {
          row.push('0');
        }
      });
    } else {
      row.push('0');
    }
    console.log(`[${header}, ${row.join(', ')}],`);
    cb();
  });

  // Retrieves a list of labels
  return api.get('/v2/labels', {limit: 500, is_root: true}, {recursive: true})
  .then(labels => {
    return new Promise((resolve, reject) => {
      fromArray.obj(labels)
      .pipe(stream1)
      .pipe(stream2)
      .pipe(stream3)
      .pipe(stream4)
      .pipe(stream5)
      .on('finish', () => {
        console.log('All labels have been processed');
        resolve();
      })
      .on('error', err => {
        reject(err);
      });
    });
  });
};
