let _client = null;
module.exports = {
  setClient: (c) => { _client = c; },
  getClient: () => _client,
};
