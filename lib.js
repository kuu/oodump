const config = require('config');
const OoyalaApi = require('ooyala-api').default;
const throughParallel = require('through2-parallel');
const fromArray = require('from2-array');
const api = new OoyalaApi(config.api.key, config.api.secret);

function createStream(concurrency, transformFunction, flushFunction) {
  return throughParallel.obj({concurrency}, transformFunction, flushFunction);
}

module.exports = function (opts) {
  const START_DATE = opts.startDate || '2012-07-12';
  const END_DATE = opts.endDate || '2016-06-30';
  const isDaily = !!opts.daily;

  // Retrieves assets with a specific label
  const stream1 = createStream(1, function (label, enc, cb) {
    api.get('/v2/assets', {where: `labels+INCLUDES+'${label.name}'`}, {pagination: true})
    .then(assets => {
      assets.forEach(asset => {
        asset.label = label.name;
        this.push(asset);
      });
      cb();
    })
    .catch(err => {
      console.error(`stream1: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives assets with a label: "${label.name}"`);
  });

  // Retrieves metadata of an asset
  const stream2 = createStream(5, function (asset, enc, cb) {
    api.get(`/v2/assets/${asset.embed_code}/metadata`)
    .then(metadata => {
      asset.metadata = metadata;
      this.push(asset);
      cb();
    })
    .catch(err => {
      console.error(`stream2: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives metadata of an asset: "${asset.name}"`);
  });

  // Retrieves daily performance of an asset
  const stream3 = createStream(5, function (asset, enc, cb) {
    const requestURL = `/v2/analytics/reports/asset/${asset.embed_code}/performance/total/${START_DATE}...${END_DATE}`;
    const flags = isDaily ? {breakdown_by: 'day'} : {};
    api.get(requestURL, flags)
    .then(body => {
      const performance = body.results ? (isDaily ? body.results.total : body.results) : null;
      this.push({
        label: asset.label,
        embedCode: asset.embed_code,
        title: asset.name,
        id: asset.metadata.contents_id || asset.metadata.zip_id,
        performance
      });
      cb();
    })
    .catch(err => {
      console.error(`stream3: An error occurred at ${err.stack}`);
      cb();
    });
    // console.log(`Retrives daily performance of an asset: "${asset.name}"`);
  });

  let currentLabel;

  // Writes to destination
  const stream4 = createStream(5, (asset, enc, cb) => {
    if (currentLabel !== asset.label) {
      currentLabel = asset.label;
      console.log(`=====<label="${currentLabel}">=====`);
    }
    const {embedCode, title, id, performance} = asset;
    const header = `[embedCode: "${embedCode}" id: "${id}" title: "${title}"],`;
    const row = [];
    if (performance) {
      performance.forEach(day => {
        const metrics = day.metrics;
        if (metrics.video && metrics.video.plays) {
          const plays = Number.parseInt(metrics.video.plays);
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
    console.log(`${header} ${row.join(', ')}`);
    cb();
  });

  // Retrieves a list of labels
  return api.get('/v2/labels', {limit: 500, is_root: true}, {pagination: true})
  .then(labels => {
    return new Promise((resolve, reject) => {
      fromArray.obj(labels)
      .pipe(stream1)
      .pipe(stream2)
      .pipe(stream3)
      .pipe(stream4)
      .on('finish', () => {
        console.log('All labels have been processed');
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
    });
  });
};
